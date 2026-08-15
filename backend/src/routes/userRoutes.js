import express from "express";
import {
    deleteMe,
    followUser,
    getAllUsers,
    getMe,
    getUser,
    isFollowing,
    removeMyAvatar,
    searchUsers,
    unfollowUser,
    updateMe,
    updateMyAvatar,
} from '../controllers/userController.js';
import { avatarUpload } from '../config/cloudinaryConfig.js';
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
// Avatar upload is multipart, so it gets its own endpoint rather than being
// folded into PATCH /me — mixing a file stream into a JSON body would mean
// parsing every profile edit as multipart.
userRouter.post('/me/avatar', writeLimiter, avatarUpload.single('pic'), updateMyAvatar);
userRouter.delete('/me/avatar', writeLimiter, removeMyAvatar);
userRouter.delete('/me', writeLimiter, deleteMe);

userRouter.get('/is-following/:id', validate(userIdParamSchema), isFollowing);
userRouter.get('/:id', validate(userIdParamSchema), getUser);

userRouter.put('/:followUserId/follow', writeLimiter, validate(followParamSchema), followUser);
userRouter.put('/:unfollowUserId/unfollow', writeLimiter, validate(unfollowParamSchema), unfollowUser);

export default userRouter;
