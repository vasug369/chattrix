import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import { badRequest, conflict, notFound } from "../utils/AppError.js";
import { blockUserService, isBlockedBetween } from "./blockService.js";

/**
 * Work out who owns the reported item and what it said, checking the reporter
 * can actually see it. Anything they can't see reads as not found, so reports
 * can't be used to probe for hidden content.
 */
const resolveTarget = async (reporterId, { targetType, targetId, postId }) => {
    if (targetType === "post") {
        const post = await Post.findById(targetId).select("author title content").lean();
        if (!post || (await isBlockedBetween(reporterId, post.author))) throw notFound("Post not found");
        return { targetUser: post.author, snapshot: `${post.title}\n\n${post.content}`, post: null };
    }

    if (targetType === "comment") {
        const post = await Post.findById(postId).select("author comments").lean();
        const comment = post?.comments?.find((c) => String(c._id) === String(targetId));
        if (!post || !comment || (await isBlockedBetween(reporterId, post.author))) {
            throw notFound("Comment not found");
        }
        return { targetUser: comment.author, snapshot: comment.content, post: post._id };
    }

    if (targetType === "message") {
        // Only the recipient can report a message: nobody else ever saw it.
        const msg = await Message.findById(targetId).select("senderId receiverId message").lean();
        if (!msg || String(msg.receiverId) !== String(reporterId)) throw notFound("Message not found");
        return { targetUser: msg.senderId, snapshot: msg.message, post: null };
    }

    // Someone who has been blocked can't see the blocker, so can't report them.
    // The blocker can still report the account they blocked.
    const user = await User.findById(targetId).select("name bio").lean();
    if (!user || (await User.exists({ _id: user._id, blocked: reporterId }))) throw notFound("User not found");
    return { targetUser: user._id, snapshot: `${user.name}\n\n${user.bio ?? ""}`, post: null };
};

/** File a report; optionally block the person behind it in the same step. */
export const createReportService = async (reporterId, input) => {
    const { targetUser, snapshot, post } = await resolveTarget(reporterId, input);
    if (String(targetUser) === String(reporterId)) throw badRequest("You can't report your own content");

    let report;
    try {
        report = await Report.create({
            reporter: reporterId,
            targetType: input.targetType,
            targetId: input.targetId,
            post,
            targetUser,
            reason: input.reason,
            details: input.details,
            snapshot: snapshot.slice(0, 6000),
        });
    } catch (err) {
        if (err?.code === 11000) throw conflict("You have already reported this");
        throw err;
    }

    if (input.alsoBlock) await blockUserService(reporterId, targetUser);

    return report;
};
