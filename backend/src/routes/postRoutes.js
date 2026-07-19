import express from 'express';
import { body } from 'express-validator';
import { createPost, getPosts, getPostById, updatePost, deletePost, getUserPosts, likePost, commentPost, feedPosts, searchPosts } from '../controllers/postController.js';
import upload from '../config/cloudinaryConfig.js';
import { validate } from '../middlewares/validate.js';

const postRouter = express.Router();

const postValidators = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
];

postRouter.post('/create', upload.single('pic'), postValidators, validate, createPost);

postRouter.get('/currentUser', getUserPosts);
postRouter.get('/getUserPosts/:userId', getUserPosts);
postRouter.get('/feed', feedPosts);
postRouter.get('/search', searchPosts);
postRouter.get('/', getPosts);
postRouter.get('/:id', getPostById);

postRouter.put('/update/:id', upload.single('pic'), updatePost);
postRouter.put('/:postId/like', likePost);
postRouter.post('/:postId/comment', commentPost);
postRouter.delete('/:id', deletePost);

export default postRouter;
