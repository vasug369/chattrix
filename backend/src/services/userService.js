import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { destroyImage } from "../config/cloudinaryConfig.js";
import { badRequest, notFound } from "../utils/AppError.js";
import { escapeRegex } from "../utils/sanitize.js";

const PUBLIC_FIELDS = "name pic bio followers following isAccountVerified createdAt";

export const getUserService = async (userId) => {
    // Explicit field list: the previous `User.findById(userId)` with no
    // projection returned the bcrypt password hash and every OTP field to any
    // caller who knew a user id.
    const user = await User.findById(userId).select(PUBLIC_FIELDS);
    if (!user) throw notFound("User not found");
    return user;
};

/** Profile view for another user, including whether the viewer follows them. */
export const getPublicProfileService = async (targetId, viewerId) => {
    const user = await User.findById(targetId).select(PUBLIC_FIELDS).lean();
    if (!user) throw notFound("User not found");

    const postCount = await Post.countDocuments({ author: targetId });

    return {
        ...user,
        followerCount: user.followers?.length ?? 0,
        followingCount: user.following?.length ?? 0,
        postCount,
        isFollowing:
            viewerId != null &&
            (user.followers ?? []).some((id) => id.toString() === viewerId.toString()),
        isSelf: viewerId != null && targetId.toString() === viewerId.toString(),
    };
};

/**
 * Update the *caller's own* profile.
 *
 * The old signature was `updateUserService(req.params.id, req.body)`, so the
 * target came from the URL and the payload was unfiltered — any logged-in user
 * could rewrite another account's password, follower list, or verified flag.
 * The id now always comes from the session, and the schema whitelists fields.
 */
export const updateUserService = async (userId, data) => {
    const user = await User.findByIdAndUpdate(userId, data, {
        new: true,
        runValidators: true,
    }).select(PUBLIC_FIELDS);
    if (!user) throw notFound("User not found");
    return user;
};

/**
 * Replace the signed-in user's avatar with a freshly uploaded image.
 *
 * The file has already reached Cloudinary by this point — multer's storage
 * engine streams it there before the handler runs — so `file.path` is the
 * delivered URL and `file.filename` is Cloudinary's public id.
 */
export const updateAvatarService = async (userId, file) => {
    if (!file?.path) throw badRequest("No image was uploaded");

    const user = await User.findById(userId).select(`${PUBLIC_FIELDS} +picPublicId`);
    if (!user) throw notFound("User not found");

    const previousPublicId = user.picPublicId;

    user.pic = file.path;
    user.picPublicId = file.filename ?? "";
    await user.save();

    // After the save, and not awaited: the new avatar is already stored, and
    // tidying up the old one must not delay the response or fail the request.
    if (previousPublicId && previousPublicId !== user.picPublicId) {
        void destroyImage(previousPublicId);
    }

    return user;
};

/** Clear the avatar, deleting the stored file if we own one. */
export const removeAvatarService = async (userId) => {
    const user = await User.findById(userId).select(`${PUBLIC_FIELDS} +picPublicId`);
    if (!user) throw notFound("User not found");

    const previousPublicId = user.picPublicId;

    user.pic = "";
    user.picPublicId = "";
    await user.save();

    // Only ever deletes our own uploads. A picture that came from Google has
    // no public id recorded, so there is nothing here to destroy.
    if (previousPublicId) void destroyImage(previousPublicId);

    return user;
};

export const followUserService = async (userId, followUserId) => {
    if (userId.toString() === followUserId.toString()) {
        throw badRequest("You cannot follow yourself");
    }

    const [user, followUser] = await Promise.all([
        User.findById(userId),
        User.findById(followUserId),
    ]);
    if (!user || !followUser) throw notFound("User not found");

    // $addToSet makes the write idempotent, so a double-click cannot push the
    // same id twice and inflate the follower count.
    await Promise.all([
        User.updateOne({ _id: followUserId }, { $addToSet: { followers: user._id } }),
        User.updateOne({ _id: userId }, { $addToSet: { following: followUser._id } }),
    ]);

    return { user, followUser };
};

export const unfollowUserService = async (userId, unfollowUserId) => {
    if (userId.toString() === unfollowUserId.toString()) {
        throw badRequest("You cannot unfollow yourself");
    }

    const [user, unfollowUser] = await Promise.all([
        User.findById(userId),
        User.findById(unfollowUserId),
    ]);
    if (!user || !unfollowUser) throw notFound("User not found");

    await Promise.all([
        User.updateOne({ _id: unfollowUserId }, { $pull: { followers: user._id } }),
        User.updateOne({ _id: userId }, { $pull: { following: unfollowUser._id } }),
    ]);

    return { user, unfollowUser };
};

export const isFollowingService = async (userId, targetId) => {
    const user = await User.findById(userId).select("following");
    if (!user) throw notFound("User not found");
    return user.following.some((id) => id.toString() === targetId.toString());
};

/**
 * Delete the caller's account and everything that pointed at it.
 *
 * The previous version deleted only the User document, leaving orphaned posts,
 * comments, messages and follow references behind that then rendered as
 * "Unknown" throughout the UI.
 */
export const deleteUserService = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");

    const id = new mongoose.Types.ObjectId(userId);

    await Promise.all([
        Post.deleteMany({ author: id }),
        Post.updateMany({ likes: id }, { $pull: { likes: id } }),
        Post.updateMany({ "comments.author": id }, { $pull: { comments: { author: id } } }),
        User.updateMany({ followers: id }, { $pull: { followers: id } }),
        User.updateMany({ following: id }, { $pull: { following: id } }),
        Notification.deleteMany({ $or: [{ recipient: id }, { actor: id }] }),
        Message.deleteMany({ $or: [{ senderId: id }, { receiverId: id }] }),
        Conversation.deleteMany({ participants: id }),
    ]);

    await user.deleteOne();
    return user;
};

export const getAllUsersService = async ({ page, limit }) => {
    const [items, total] = await Promise.all([
        User.find()
            .select(PUBLIC_FIELDS)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(),
    ]);

    return {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
};

export const searchUsersService = async (query, { page, limit }, excludeId) => {
    const term = escapeRegex(query);
    const filter = {
        $or: [{ name: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }],
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    };

    const [items, total] = await Promise.all([
        User.find(filter)
            .select(PUBLIC_FIELDS)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        User.countDocuments(filter),
    ]);

    return {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
};
