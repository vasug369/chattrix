import express from "express";
import {
    deleteUser,
    followUser,
    getUser,
    unfollowUser,
    updateUser,
    getAllUsers,
    searchUsers,
} from '../controllers/userController.js';
import upload from '../config/cloudinaryConfig.js';

const userRouter = express.Router();

userRouter.get('/getAllUsers', getAllUsers);

userRouter.get('/me', (req, res) => {
    res.status(200).json({
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        pic: req.user.pic,
        bio: req.user.bio,
        isAccountVerified: req.user.isAccountVerified,
        following: req.user.following,
        followers: req.user.followers,
    });
});

userRouter.get('/search', searchUsers);

userRouter.put('/:followUserId/follow', followUser);
userRouter.put('/:unfollowUserId/unfollow', unfollowUser);
userRouter.delete('/', deleteUser);

userRouter.get('/:id', getUser);
userRouter.put('/:id', upload.single('pic'), updateUser);

export default userRouter;
