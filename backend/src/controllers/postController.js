import {
    createPostService,
    getPostByIdService,
    getPostsService,
    updatePostService,
    deletePostService,
} from '../services/postService.js';

export const createPost = async (req, res) => {
    try {
        const postData = req.body;
        const newPost = await createPostService(postData);
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPosts = async (req, res) => {
    try {
        console.log('cookie', req.cookies);
        const posts = await getPostsService();
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await getPostById(postId);
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
        const postId = req.params.id;
        const updateData = req.body;
        const updatedPost = await updatePostService(postId, updateData);
        if (!updatedPost) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const deleted = await deletePostService(postId);
        if (!deleted) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
