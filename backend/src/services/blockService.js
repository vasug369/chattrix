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
 * surfacing. The follow state is recorded first so unblocking can restore it.
 */
export const blockUserService = async (userId, targetId) => {
    if (userId.toString() === targetId.toString()) throw badRequest("You cannot block yourself");

    const [target, me] = await Promise.all([
        User.findById(targetId).select("_id name"),
        User.findById(userId).select("following followers +blocked"),
    ]);
    if (!target) throw notFound("User not found");

    // Already blocked: keep the original snapshot instead of overwriting it
    // with the (now empty) follow state.
    if (me?.blocked?.some((id) => id.equals(target._id))) return target;

    const snapshot = {
        user: target._id,
        iFollowed: me?.following?.some((id) => id.equals(target._id)) ?? false,
        theyFollowed: me?.followers?.some((id) => id.equals(target._id)) ?? false,
    };

    await User.updateOne({ _id: userId }, { $pull: { blockedFollows: { user: target._id } } });
    await Promise.all([
        User.updateOne(
            { _id: userId },
            {
                $addToSet: { blocked: target._id },
                $push: { blockedFollows: snapshot },
                $pull: { following: target._id, followers: target._id },
            }
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

/**
 * Undo a block and restore the follows the block removed, as recorded at
 * block time. Nothing is restored while the other person still blocks the
 * caller.
 */
export const unblockUserService = async (userId, targetId) => {
    const me = await User.findById(userId).select("+blockedFollows").lean();
    const snapshot = me?.blockedFollows?.find((s) => String(s.user) === String(targetId));

    await User.updateOne(
        { _id: userId },
        { $pull: { blocked: targetId, blockedFollows: { user: targetId } } }
    );

    if (!snapshot || (await isBlockedBetween(userId, targetId))) return;
    if (!(await User.exists({ _id: targetId }))) return;

    const writes = [];
    if (snapshot.iFollowed) {
        writes.push(
            User.updateOne({ _id: userId }, { $addToSet: { following: targetId } }),
            User.updateOne({ _id: targetId }, { $addToSet: { followers: userId } })
        );
    }
    if (snapshot.theyFollowed) {
        writes.push(
            User.updateOne({ _id: targetId }, { $addToSet: { following: userId } }),
            User.updateOne({ _id: userId }, { $addToSet: { followers: targetId } })
        );
    }
    await Promise.all(writes);
};

/** The caller's blocked accounts, for the settings screen. */
export const listBlockedService = async (userId) => {
    const me = await User.findById(userId)
        .select("+blocked")
        .populate("blocked", "name pic")
        .lean();
    return me?.blocked ?? [];
};
