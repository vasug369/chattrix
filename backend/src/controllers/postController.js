import {
    commentPostService,
    createPostService,
    deletePostService,
    feedPostsService,
    getPostByIdService,
    getPostsService,
    getUserPostsService,
    searchPostsService,
    toggleLikeService,
    updatePostService,
} from '../services/postService.js';
import { notify, removeNotification } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/AppError.js';
import { cloudinaryEnabled } from '../config/cloudinaryConfig.js';

export const createPost = asyncHandler(async (req, res) => {
    // `author` comes from the session, never the body — validation strips any
    // client-supplied author so a caller cannot post as somebody else.
    const postData = { ...req.body, author: req.user._id };

    if (req.file) {
        if (!cloudinaryEnabled) throw badRequest('Image uploads are not configured on this server');
        postData.pic = req.file.path;
    }

    const newPost = await createPostService(postData);
    const populated = await newPost.populate('author', 'name pic');
    res.status(201).json({ success: true, data: populated });
});

export const getPosts = asyncHandler(async (req, res) => {
    const result = await getPostsService(req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const getPostById = asyncHandler(async (req, res) => {
    const post = await getPostByIdService(req.params.id);
    res.status(200).json({ success: true, data: post });
});

export const updatePost = asyncHandler(async (req, res) => {
    const updated = await updatePostService(req.params.id, req.user._id, req.body);
    res.status(200).json({ success: true, data: updated });
});

export const deletePost = asyncHandler(async (req, res) => {
    await deletePostService(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
});

export const getMyPosts = asyncHandler(async (req, res) => {
    const result = await getUserPostsService(req.user._id, req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const getUserPosts = asyncHandler(async (req, res) => {
    const result = await getUserPostsService(req.params.userId, req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const likePost = asyncHandler(async (req, res) => {
    const { post, liked, likeCount } = await toggleLikeService(req.params.postId, req.user._id);

    if (liked) {
        await notify({
            recipient: post.author,
            actor: req.user._id,
            type: 'like',
            post: post._id,
            preview: post.title,
        });
    } else {
        // Withdraw the notification too, so an unliked post stops nagging.
        await removeNotification({
            recipient: post.author,
            actor: req.user._id,
            type: 'like',
            post: post._id,
        });
    }

    res.status(200).json({
        success: true,
        message: liked ? 'Post liked' : 'Like removed',
        data: { liked, likeCount, likes: post.likes },
    });
});

export const commentPost = asyncHandler(async (req, res) => {
    const { post, comment } = await commentPostService(
        req.params.postId,
        req.user,
        req.body.content
    );

    await notify({
        recipient: post.author._id ?? post.author,
        actor: req.user._id,
        type: 'comment',
        post: post._id,
        preview: comment.content.slice(0, 140),
    });

    res.status(201).json({ success: true, data: post });
});

export const feedPosts = asyncHandler(async (req, res) => {
    const result = await feedPostsService(req.user._id, req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const searchPosts = asyncHandler(async (req, res) => {
    const { q, ...pagination } = req.validatedQuery;
    const result = await searchPostsService(q, pagination);
    res.status(200).json({ success: true, ...result });
});
