import AdminAction from "../models/adminAction.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import Report from "../models/report.model.js";
import User, { PERMANENT_SUSPENSION, isSuspended } from "../models/user.model.js";
import { badRequest, forbidden, notFound } from "../utils/AppError.js";
import { escapeRegex } from "../utils/sanitize.js";
import { revokeAllSessionsService } from "./sessionService.js";

const USER_SUMMARY = "name email pic isAccountVerified role suspendedUntil suspensionReason createdAt";
const pages = (total, limit) => Math.ceil(total / limit) || 1;

const audit = (admin, action, fields = {}) => AdminAction.create({ admin, action, ...fields });

/**
 * Reports grouped by the item they point at, so ten reports of one post are
 * one row with a count. Busiest items first, then oldest.
 */
export const listReportsService = async ({ status, page, limit }) => {
    const [rows, totals] = await Promise.all([
        Report.aggregate([
            { $match: { status } },
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: { targetType: "$targetType", targetId: "$targetId" },
                    reportId: { $first: "$_id" },
                    targetUser: { $first: "$targetUser" },
                    snapshot: { $first: "$snapshot" },
                    reasons: { $addToSet: "$reason" },
                    count: { $sum: 1 },
                    firstAt: { $min: "$createdAt" },
                    lastAt: { $max: "$createdAt" },
                },
            },
            { $sort: { count: -1, firstAt: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: { from: "users", localField: "targetUser", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    reportId: 1,
                    targetType: "$_id.targetType",
                    targetId: "$_id.targetId",
                    reasons: 1,
                    count: 1,
                    firstAt: 1,
                    lastAt: 1,
                    snapshot: { $substrCP: ["$snapshot", 0, 160] },
                    targetUser: { _id: "$user._id", name: "$user.name", pic: "$user.pic" },
                },
            },
        ]),
        Report.aggregate([
            { $match: { status } },
            { $group: { _id: { t: "$targetType", id: "$targetId" } } },
            { $count: "n" },
        ]),
    ]);

    const total = totals[0]?.n ?? 0;
    return { items: rows, pagination: { page, limit, total, pages: pages(total, limit) } };
};

/** One report with every report on the same item and the author's history. */
export const getReportService = async (reportId) => {
    const report = await Report.findById(reportId).lean();
    if (!report) throw notFound("Report not found");

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [related, user, reportsAgainst, pastActions, stillExists] = await Promise.all([
        Report.find({ targetType: report.targetType, targetId: report.targetId })
            .sort({ createdAt: 1 })
            .populate("reporter", "name")
            .lean(),
        User.findById(report.targetUser).select(USER_SUMMARY).lean(),
        Report.countDocuments({ targetUser: report.targetUser, createdAt: { $gte: since } }),
        AdminAction.countDocuments({ targetUser: report.targetUser }),
        targetExists(report),
    ]);

    return {
        ...report,
        reports: related.map((r) => ({
            _id: r._id,
            reporter: r.reporter,
            reason: r.reason,
            details: r.details,
            status: r.status,
            createdAt: r.createdAt,
        })),
        targetUser: user ? { ...user, isSuspended: isSuspended(user) } : null,
        reportsAgainst90d: reportsAgainst,
        pastActions,
        contentExists: stillExists,
    };
};

const targetExists = async ({ targetType, targetId, post }) => {
    if (targetType === "post") return Boolean(await Post.exists({ _id: targetId }));
    if (targetType === "comment") return Boolean(await Post.exists({ _id: post, "comments._id": targetId }));
    if (targetType === "message") return Boolean(await Message.exists({ _id: targetId }));
    return Boolean(await User.exists({ _id: targetId }));
};

/** Delete the reported item. Accounts are suspended, never "removed". */
const removeTarget = async ({ targetType, targetId, post }) => {
    if (targetType === "post") await Post.deleteOne({ _id: targetId });
    else if (targetType === "comment") await Post.updateOne({ _id: post }, { $pull: { comments: { _id: targetId } } });
    else if (targetType === "message") {
        await Promise.all([
            Message.deleteOne({ _id: targetId }),
            Conversation.updateOne({ messages: targetId }, { $pull: { messages: targetId } }),
        ]);
    } else throw badRequest("Accounts can't be removed. Suspend the account instead.");
};

/**
 * Close every open report on the same item: remove the content, or dismiss
 * the reports as not a violation. Always audited.
 */
export const resolveReportService = async (adminId, reportId, { action, note }) => {
    const report = await Report.findById(reportId);
    if (!report) throw notFound("Report not found");
    if (report.status !== "open") throw badRequest("This report is already closed");

    if (action === "remove") await removeTarget(report);

    const status = action === "remove" ? "resolved" : "dismissed";
    const resolution = action === "remove" ? "removed" : "dismissed";
    const result = await Report.updateMany(
        { targetType: report.targetType, targetId: report.targetId, status: "open" },
        { $set: { status, resolution, resolvedBy: adminId, resolvedAt: new Date(), note } }
    );

    await audit(adminId, `report.${resolution}`, {
        targetType: report.targetType,
        targetId: report.targetId,
        targetUser: report.targetUser,
        note,
        meta: { reportId: report._id, reportsClosed: result.modifiedCount ?? 0 },
    });

    return { status, reportsClosed: result.modifiedCount ?? 0 };
};

/**
 * Suspend an account for 1, 7 or 30 days, or permanently (`days: null`).
 * Signs the account out everywhere: tokenVersion retires its tokens and every
 * session row is revoked, which also closes its sockets.
 */
export const suspendUserService = async (adminId, userId, { days, reason }) => {
    if (String(adminId) === String(userId)) throw badRequest("You can't suspend yourself");
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");
    if (user.role === "admin") throw forbidden("Admins can't be suspended");

    user.suspendedUntil = days == null ? PERMANENT_SUSPENSION : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    user.suspensionReason = reason;
    user.tokenVersion += 1;
    await user.save();
    await revokeAllSessionsService(user._id);

    await audit(adminId, "user.suspended", {
        targetType: "user",
        targetId: user._id,
        targetUser: user._id,
        note: reason,
        meta: { days, until: user.suspendedUntil },
    });

    return { _id: user._id, suspendedUntil: user.suspendedUntil, suspensionReason: user.suspensionReason };
};

export const unsuspendUserService = async (adminId, userId) => {
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");
    if (!isSuspended(user)) throw badRequest("This account isn't suspended");

    user.suspendedUntil = null;
    user.suspensionReason = "";
    await user.save();

    await audit(adminId, "user.unsuspended", { targetType: "user", targetId: user._id, targetUser: user._id });
    return { _id: user._id, suspendedUntil: null };
};

/** Accounts for the admin Users page, with open-report counts. */
export const listUsersService = async ({ q, status, page, limit }) => {
    const filter = {};
    if (q) {
        const term = escapeRegex(q);
        filter.$or = [{ name: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }];
    }
    if (status === "suspended") filter.suspendedUntil = { $gt: new Date() };

    const [users, total] = await Promise.all([
        User.find(filter).select(USER_SUMMARY).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
    ]);

    const ids = users.map((u) => u._id);
    const counts = await Report.aggregate([
        { $match: { targetUser: { $in: ids }, status: "open" } },
        { $group: { _id: "$targetUser", n: { $sum: 1 } } },
    ]);
    const openBy = new Map(counts.map((c) => [String(c._id), c.n]));

    return {
        items: users.map((u) => ({ ...u, isSuspended: isSuspended(u), openReports: openBy.get(String(u._id)) ?? 0 })),
        pagination: { page, limit, total, pages: pages(total, limit) },
    };
};

export const listAuditService = async ({ page, limit }) => {
    const [items, total] = await Promise.all([
        AdminAction.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("admin", "name")
            .populate("targetUser", "name")
            .lean(),
        AdminAction.countDocuments(),
    ]);
    return { items, pagination: { page, limit, total, pages: pages(total, limit) } };
};
