import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { forbidden, notFound } from "../utils/AppError.js";
import { escapeRegex } from "../utils/sanitize.js";
import { hiddenUserIds, isBlockedBetween } from "./blockService.js";

const AUTHOR_FIELDS = "name pic";

/** Drop comments written by anyone in `hidden` (blocked in either direction). */
const withoutHiddenComments = (post, hidden) => {
    if (!hidden.length || !post.comments?.length) return post;
    const ids = new Set(hidden.map(String));
    return { ...post, comments: post.comments.filter((c) => !ids.has(String(c.author))) };
};

/** Consistent shape for every paginated list the API returns. */
const paginate = async (query, { page, limit }, countFilter, hidden = []) => {
    const [items, total] = await Promise.all([
        query
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("author", AUTHOR_FIELDS)
            .lean(),
        Post.countDocuments(countFilter),
    ]);

    return {
        items: items.map((p) => withoutHiddenComments(p, hidden)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
};

const emptyPage = ({ page, limit }) => ({ items: [], pagination: { page, limit, total: 0, pages: 1 } });

/** Load a post the viewer is allowed to see; blocked either way reads as missing. */
const findVisiblePost = async (postId, viewerId) => {
    const post = await Post.findById(postId);
    if (!post || (await isBlockedBetween(viewerId, post.author))) throw notFound("Post not found");
    return post;
};

export const createPostService = (data) => Post.create(data);

export const getPostByIdService = async (postId, viewerId) => {
    const post = await findVisiblePost(postId, viewerId);
    await post.populate("author", AUTHOR_FIELDS);
    return withoutHiddenComments(post.toJSON(), await hiddenUserIds(viewerId));
};

export const getPostsService = async (pagination, viewerId) => {
    // An empty result is a legitimate empty feed, not an error. The previous
    // implementation threw 'No posts found', which surfaced as a 500.
    const hidden = await hiddenUserIds(viewerId);
    const filter = { author: { $nin: hidden } };
    return paginate(Post.find(filter), pagination, filter, hidden);
};

/**
 * Load a post and assert the caller owns it.
 *
 * updatePost and deletePost previously took only an id, so any authenticated
 * user could edit or delete any post in the database just by knowing its id.
 */
const assertOwnership = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw notFound("Post not found");
    if (post.author.toString() !== userId.toString()) {
        throw forbidden("You can only modify your own posts");
    }
    return post;
};

export const updatePostService = async (postId, userId, data) => {
    const post = await assertOwnership(postId, userId);
    Object.assign(post, data, { updatedAt: new Date() });
    await post.save();
    return post.populate("author", AUTHOR_FIELDS);
};

export const deletePostService = async (postId, userId) => {
    const post = await assertOwnership(postId, userId);
    await post.deleteOne();
    return post;
};

/** A user's posts; empty when the viewer and author have blocked each other. */
export const getUserPostsService = async (userId, pagination, viewerId) => {
    if (viewerId && (await isBlockedBetween(viewerId, userId))) return emptyPage(pagination);
    const hidden = await hiddenUserIds(viewerId);
    return paginate(Post.find({ author: userId }), pagination, { author: userId }, hidden);
};

export const commentPostService = async (postId, user, content) => {
    const post = await findVisiblePost(postId, user._id);

    post.comments.push({
        author: user._id,
        content,
        name: user.name,
        createdAt: new Date(),
    });
    await post.save();

    return {
        post: await post.populate("author", AUTHOR_FIELDS),
        comment: post.comments[post.comments.length - 1],
    };
};

export const toggleLikeService = async (postId, userId) => {
    const post = await findVisiblePost(postId, userId);

    const id = userId.toString();
    const alreadyLiked = post.likes.some((likeId) => likeId.toString() === id);

    if (alreadyLiked) {
        post.likes = post.likes.filter((likeId) => likeId.toString() !== id);
    } else {
        post.likes.push(userId);
    }
    await post.save();

    return { post, liked: !alreadyLiked, likeCount: post.likes.length };
};

/**
 * Posts from everyone the user follows, newest first.
 *
 * The previous version looped over `following` issuing one query per followed
 * user and pushed each result *array* into an accumulator — so the endpoint
 * returned an array of arrays in follow order, not a merged chronological
 * feed, and did N round-trips. One `$in` query replaces it.
 */
export const feedPostsService = async (userId, pagination) => {
    const user = await User.findById(userId).select("following");
    if (!user) throw notFound("User not found");

    // Include the user's own posts so a new account's feed isn't empty.
    const authorIds = [...user.following, user._id];
    const hidden = await hiddenUserIds(userId);
    const filter = { author: { $in: authorIds, $nin: hidden } };

    return paginate(Post.find(filter), pagination, filter, hidden);
};

export const searchPostsService = async (searchQuery, pagination, viewerId) => {
    // Escaped: raw user input reaching $regex is both a ReDoS vector and a way
    // to match every document with '.*'.
    const term = escapeRegex(searchQuery);
    const hidden = await hiddenUserIds(viewerId);
    const filter = {
        author: { $nin: hidden },
        $or: [
            { title: { $regex: term, $options: "i" } },
            { content: { $regex: term, $options: "i" } },
        ],
    };

    return paginate(Post.find(filter), pagination, filter, hidden);
};
