import express from "express";
import {deleteUser, followUser, getUser,unfollowUser,updateUser} from '../controllers/userController.js';
const userRouter = express.Router();

userRouter.get('/:id',getUser);

userRouter.put('/:followUserId/follow',followUser); // Assuming you want to follow a user, you can implement the logic in the controller
userRouter.put('/:unfollowUserId/unfollow',unfollowUser); // Assuming you want to follow a user, you can implement the logic in the controller
userRouter.put('/:id',updateUser); // Assuming you want to update user details, you can implement the logic in the controller
userRouter.delete('/', deleteUser); // Assuming you want to delete a user, you can implement the logic in the controller
    


export default userRouter;
