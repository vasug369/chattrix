import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { badRequest, notFound } from "../utils/AppError.js";

/**
 * Blocking is symmetric in effect: once either user blocks the other, neither
 * can see, follow, message or notify the other. Only the blocker can undo it.
 */

/** Ids hidden from `userId`: people they blocked plus people who blocked them. */
export const hiddenUserIds = async (userId) => {
    if (!userId) return [];
    const [me, blockers] = await Promise.all([
        User.findById(userId).select("+blocked").lean(),
        User.find({ blocked: userId }).select("_id").lean(),
    ]);
    return [...(me?.blocked ?? []), ...blockers.map((u) => u._id)];
};

/** True when either user has blocked the other. */
export const isBlockedBetween = async (a, b) => {
    if (!a || !b) return false;
    return Boolean(
        await User.exists({ $or: [{ _id: a, blocked: b }, { _id: b, blocked: a }] })
    );
};

/**
 * Block `targetId` for `userId`.
 *
 * Also removes the follow relationship in both directions and the
 * notifications between the two, so nothing from before the block keeps
 * surfacing.
 */
export const blockUserService = async (userId, targetId) => {
    if (userId.toString() === targetId.toString()) throw badRequest("You cannot block yourself");

    const target = await User.findById(targetId).select("_id name");
    if (!target) throw notFound("User not found");

    await Promise.all([
        User.updateOne(
            { _id: userId },
            { $addToSet: { blocked: target._id }, $pull: { following: target._id, followers: target._id } }
        ),
        User.updateOne({ _id: target._id }, { $pull: { following: userId, followers: userId } }),
        Notification.deleteMany({
            $or: [
                { recipient: userId, actor: target._id },
                { recipient: target._id, actor: userId },
            ],
        }),
    ]);

    return target;
};

/** Undo a block. Follows removed by the block are not restored. */
export const unblockUserService = async (userId, targetId) => {
    await User.updateOne({ _id: userId }, { $pull: { blocked: targetId } });
};

/** The caller's blocked accounts, for the settings screen. */
export const listBlockedService = async (userId) => {
    const me = await User.findById(userId)
        .select("+blocked")
        .populate("blocked", "name pic")
        .lean();
    return me?.blocked ?? [];
};
