import express from 'express';
// const { createPost, getPosts, getPostById, updatePost, deletePost } = require('../controllers/postController');
import { createPost, getPosts, getPostById, updatePost, deletePost, getUserPosts ,likePost,commentPost, feedPosts, searchPosts} from '../controllers/postController.js';
const postRouter = express.Router();

// Route to create a new post
postRouter.post('/create', createPost);






//get posts by user ID
postRouter.get('/currentUser', getUserPosts);

postRouter.get('/getUserPosts/:userId', getUserPosts);

//getting user specific feed posts for followwed account
postRouter.get('/feed', feedPosts);

postRouter.get('/search', searchPosts);

// Route to get all posts
postRouter.get('/', getPosts);


// Route to get a single post by ID
postRouter.get('/:id', getPostById);


// Route to update a post by ID
postRouter.put('/update/:id', updatePost);


//like a post by ID
postRouter.put('/:postId/like', likePost);


//comment ona post by ID
postRouter.post('/:postId/comment', commentPost);

// Route to delete a post by ID
postRouter.delete('/:id', deletePost);



export default postRouter;