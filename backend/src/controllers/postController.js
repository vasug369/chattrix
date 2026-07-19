import {
    createPostService,
    getPostByIdService,
    getPostsService,
    updatePostService,
    deletePostService,
    getUserPostsService,
    likePostService,
    commentPostService,
    feedPostsService,
    searchPostsService
} from '../services/postService.js';
import { uploadBufferToCloudinary } from '../config/cloudinaryConfig.js';

export const createPost = async (req, res) => {
    try {
        const userId = req.user._id;
        req.body.author = userId;

        if (req.file) {
            const result = await uploadBufferToCloudinary(req.file.buffer, 'chattrix_posts');
            req.body.pic = result.secure_url;
        }

        const newPost = await createPostService(req.body);
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPosts = async (req, res) => {
    try {
        const result = await getPostsService(req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPostById = async (req, res) => {
    try {
        const post = await getPostByIdService(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePost = async (req, res) => {
    try {
        const post = await getPostByIdService(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        if (post.author._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only edit your own posts' });
        }

        if (req.file) {
            const result = await uploadBufferToCloudinary(req.file.buffer, 'chattrix_posts');
            req.body.pic = result.secure_url;
        }

        const updatedPost = await updatePostService(req.params.id, req.body);
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await getPostByIdService(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        if (post.author._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own posts' });
        }

        await deletePostService(req.params.id);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;
        const result = await getUserPostsService(userId, req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const likePost = async (req, res) => {
    try {
        const result = await likePostService(req.params.postId, req.user._id);
        if (!result) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json({
            message: result.liked ? 'Post liked successfully' : 'Post unliked successfully',
            post: result.post,
            likes: result.post.likes,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const commentPost = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }
        const post = await commentPostService(req.params.postId, req.user._id, content.trim());
        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const feedPosts = async (req, res) => {
    try {
        const result = await feedPostsService(req.user._id, req.query);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const posts = await searchPostsService(searchQuery);
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
