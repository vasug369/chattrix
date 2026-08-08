import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { forbidden, notFound } from "../utils/AppError.js";
import { escapeRegex } from "../utils/sanitize.js";

const AUTHOR_FIELDS = "name pic";

/** Consistent shape for every paginated list the API returns. */
const paginate = async (query, { page, limit }, countFilter) => {
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
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
};

export const createPostService = (data) => Post.create(data);

export const getPostByIdService = async (postId) => {
    const post = await Post.findById(postId).populate("author", AUTHOR_FIELDS);
    if (!post) throw notFound("Post not found");
    return post;
};

export const getPostsService = (pagination) =>
    // An empty result is a legitimate empty feed, not an error. The previous
    // implementation threw 'No posts found', which surfaced as a 500.
    paginate(Post.find(), pagination, {});

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

export const getUserPostsService = (userId, pagination) =>
    paginate(Post.find({ author: userId }), pagination, { author: userId });

export const commentPostService = async (postId, user, content) => {
    const post = await Post.findById(postId);
    if (!post) throw notFound("Post not found");

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
    const post = await Post.findById(postId);
    if (!post) throw notFound("Post not found");

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
    const filter = { author: { $in: authorIds } };

    return paginate(Post.find(filter), pagination, filter);
};

export const searchPostsService = (searchQuery, pagination) => {
    // Escaped: raw user input reaching $regex is both a ReDoS vector and a way
    // to match every document with '.*'.
    const term = escapeRegex(searchQuery);
    const filter = {
        $or: [
            { title: { $regex: term, $options: "i" } },
            { content: { $regex: term, $options: "i" } },
        ],
    };

    return paginate(Post.find(filter), pagination, filter);
};
