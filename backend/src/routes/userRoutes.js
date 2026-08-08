import express from "express";
import {
    deleteMe,
    followUser,
    getAllUsers,
    getMe,
    getUser,
    isFollowing,
    searchUsers,
    unfollowUser,
    updateMe,
} from '../controllers/userController.js';
import { writeLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import {
    followParamSchema,
    listUsersSchema,
    searchUsersSchema,
    unfollowParamSchema,
    updateProfileSchema,
    userIdParamSchema,
} from '../validation/user.schema.js';

const userRouter = express.Router();

// Literal segments first so they aren't swallowed by '/:id'.
userRouter.get('/getAllUsers', validate(listUsersSchema), getAllUsers);
userRouter.get('/search', validate(searchUsersSchema), searchUsers);
userRouter.get('/me', getMe);
userRouter.patch('/me', writeLimiter, validate(updateProfileSchema), updateMe);
userRouter.delete('/me', writeLimiter, deleteMe);

userRouter.get('/is-following/:id', validate(userIdParamSchema), isFollowing);
userRouter.get('/:id', validate(userIdParamSchema), getUser);

userRouter.put('/:followUserId/follow', writeLimiter, validate(followParamSchema), followUser);
userRouter.put('/:unfollowUserId/unfollow', writeLimiter, validate(unfollowParamSchema), unfollowUser);

export default userRouter;
