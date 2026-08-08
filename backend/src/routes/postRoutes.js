import express from 'express';
import {
    commentPost,
    createPost,
    deletePost,
    feedPosts,
    getMyPosts,
    getPostById,
    getPosts,
    getUserPosts,
    likePost,
    searchPosts,
    updatePost,
} from '../controllers/postController.js';
import upload from '../config/cloudinaryConfig.js';
import { writeLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import {
    commentSchema,
    createPostSchema,
    listPostsSchema,
    postIdBodyParamSchema,
    postIdParamSchema,
    searchPostsSchema,
    updatePostSchema,
    userPostsSchema,
} from '../validation/post.schema.js';

const postRouter = express.Router();

postRouter.post('/create', writeLimiter, upload.single('pic'), validate(createPostSchema), createPost);

// Literal paths must be registered before '/:id', or Express matches
// '/feed' and '/search' as post ids and every request 400s on a bad ObjectId.
postRouter.get('/currentUser', validate(listPostsSchema), getMyPosts);
postRouter.get('/feed', validate(listPostsSchema), feedPosts);
postRouter.get('/search', validate(searchPostsSchema), searchPosts);
postRouter.get('/getUserPosts/:userId', validate(userPostsSchema), getUserPosts);

postRouter.get('/', validate(listPostsSchema), getPosts);
postRouter.get('/:id', validate(postIdParamSchema), getPostById);

postRouter.put('/update/:id', writeLimiter, validate(updatePostSchema), updatePost);
postRouter.put('/:postId/like', writeLimiter, validate(postIdBodyParamSchema), likePost);
postRouter.post('/:postId/comment', writeLimiter, validate(commentSchema), commentPost);
postRouter.delete('/:id', writeLimiter, validate(postIdParamSchema), deletePost);

export default postRouter;
