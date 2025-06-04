import express from 'express';
// const { createPost, getPosts, getPostById, updatePost, deletePost } = require('../controllers/postController');
import { createPost, getPosts, getPostById, updatePost, deletePost } from '../controllers/postController.js';
const postRouter = express.Router();

// Route to create a new post
postRouter.post('/create', createPost);

// Route to get all posts
postRouter.get('/', getPosts);

// Route to get a single post by ID
postRouter.get('/:id', getPostById);

// Route to update a post by ID
postRouter.put('/:id', updatePost);

// Route to delete a post by ID
postRouter.delete('/:id', deletePost);

export default postRouter;