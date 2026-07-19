import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { createNotification } from "./notificationService.js";

const paginate = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
    return { page, limit, skip: (page - 1) * limit };
};

export const createPostService = async (data) => {
    const post = new Post(data);
    await post.save();
    return Post.findById(post._id).populate('author', 'name pic');
};

export const getPostByIdService = async (postId) => {
    return Post.findById(postId).populate('author', 'name pic').populate('comments.author', 'name pic');
};

export const getPostsService = async (query = {}) => {
    const { page, limit, skip } = paginate(query);
    const [posts, total] = await Promise.all([
        Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name pic').populate('comments.author', 'name pic'),
        Post.countDocuments(),
    ]);
    return { posts, page, limit, total, hasMore: skip + posts.length < total };
};

export const updatePostService = async (postId, data) => {
    const allowedFields = ['title', 'content', 'pic'];
    const updateData = {};
    for (const field of allowedFields) {
        if (data[field] !== undefined) updateData[field] = data[field];
    }
    updateData.updatedAt = Date.now();

    return Post.findByIdAndUpdate(postId, updateData, { new: true, runValidators: true }).populate('author', 'name pic').populate('comments.author', 'name pic');
};

export const deletePostService = async (postId) => {
    return Post.findByIdAndDelete(postId);
};

export const getUserPostsService = async (userId, query = {}) => {
    const { page, limit, skip } = paginate(query);
    const [posts, total] = await Promise.all([
        Post.find({ author: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name pic').populate('comments.author', 'name pic'),
        Post.countDocuments({ author: userId }),
    ]);
    return { posts, page, limit, total, hasMore: skip + posts.length < total };
};

export const likePostService = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) return null;

    const alreadyLiked = post.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
        post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
        post.likes.push(userId);
        await createNotification({ recipient: post.author, sender: userId, type: 'like', post: post._id });
    }

    await post.save();
    return { post, liked: !alreadyLiked };
};

export const commentPostService = async (postId, userId, content) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error('Post not found');
    }
    const commenter = await User.findById(userId, 'name');
    if (!commenter) {
        throw new Error('User not found');
    }

    post.comments.push({ author: userId, content, name: commenter.name });
    await post.save();

    await createNotification({ recipient: post.author, sender: userId, type: 'comment', post: post._id });

    return Post.findById(postId).populate('author', 'name pic').populate('comments.author', 'name pic');
};

export const feedPostsService = async (userId, query = {}) => {
    const user = await User.findById(userId).select('following');
    const followingIds = user?.following || [];

    const { page, limit, skip } = paginate(query);
    const filter = { author: { $in: [...followingIds, userId] } };

    const [posts, total] = await Promise.all([
        Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name pic').populate('comments.author', 'name pic'),
        Post.countDocuments(filter),
    ]);

    return { posts, page, limit, total, hasMore: skip + posts.length < total };
};

export const searchPostsService = async (searchQuery) => {
    if (!searchQuery) return [];
    return Post.find({
        $or: [
            { title: { $regex: searchQuery, $options: 'i' } },
            { content: { $regex: searchQuery, $options: 'i' } },
        ],
    }).sort({ createdAt: -1 }).populate('author', 'name pic').populate('comments.author', 'name pic');
};
