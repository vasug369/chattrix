import User from "../models/user.model.js";
import Post from "../models/post.model.js";

export const getProfileService = async (profileId, viewerId) => {
    const user = await User.findById(profileId).select('-password');
    if (!user) {
        throw new Error("User not found");
    }

    const postsCount = await Post.countDocuments({ author: profileId });

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        bio: user.bio,
        createdAt: user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount,
        isFollowing: viewerId ? user.followers.some(id => id.toString() === viewerId.toString()) : false,
        isSelf: viewerId ? user._id.toString() === viewerId.toString() : false,
    };
};
