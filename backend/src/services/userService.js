import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { createNotification } from "./notificationService.js";

// Never send these to the client, even for the user's own list/search results.
export const PUBLIC_USER_EXCLUDE = '-password -verifyOtp -verifyOtpExpireAt -resetOtp -resetOtpExpireAt';

export const getUserService = async (userId) => {
    const user = await User.findById(userId).select(PUBLIC_USER_EXCLUDE);
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

const ALLOWED_UPDATE_FIELDS = ['name', 'bio', 'pic'];

export const updateUserService = async (userId, data) => {
    const updateData = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
        if (data[field] !== undefined) updateData[field] = data[field];
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select(PUBLIC_USER_EXCLUDE);
    if (!updatedUser) {
        throw new Error('User not found');
    }
    return updatedUser;
};

export const followUserService = async (userId, followUserId) => {
    if (userId.toString() === followUserId.toString()) {
        throw new Error("You can't follow yourself");
    }

    const user = await User.findById(userId);
    const followUser = await User.findById(followUserId);
    if (!user || !followUser) {
        throw new Error('User or follow user not found');
    }

    if (!followUser.followers.some(id => id.toString() === user._id.toString())) {
        followUser.followers.push(user._id);
    }

    if (!user.following.some(id => id.toString() === followUser._id.toString())) {
        user.following.push(followUser._id);
    }

    await followUser.save();
    await user.save();

    await createNotification({ recipient: followUser._id, sender: user._id, type: 'follow' });

    return { user, followUser };
};

export const unfollowUserService = async (userId, unfollowUserId) => {
    const user = await User.findById(userId);
    const unfollowUser = await User.findById(unfollowUserId);
    if (!user || !unfollowUser) {
        throw new Error('User or unfollow user not found');
    }

    user.following = user.following.filter(id => id.toString() !== unfollowUser._id.toString());
    unfollowUser.followers = unfollowUser.followers.filter(id => id.toString() !== user._id.toString());

    await user.save();
    await unfollowUser.save();
    return { user, unfollowUser };
};

export const deleteUserService = async (userId) => {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
        throw new Error('User not found');
    }

    // Keep data consistent: clean up everything that referenced this user.
    await Post.deleteMany({ author: userId });
    await User.updateMany(
        { $or: [{ followers: userId }, { following: userId }] },
        { $pull: { followers: userId, following: userId } }
    );
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

    return deletedUser;
};

export const getAllUsersService = async () => {
    return User.find({}).select(PUBLIC_USER_EXCLUDE);
};

export const searchUsersService = async (query, excludeUserId) => {
    if (!query) return [];
    return User.find({
        _id: { $ne: excludeUserId },
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
        ],
    }).select(PUBLIC_USER_EXCLUDE).limit(20);
};
