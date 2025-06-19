import express from "express";
import {deleteUser, followUser, getUser,unfollowUser,updateUser,getAllUsers} from '../controllers/userController.js';
const userRouter = express.Router();

userRouter.get('/getAllUsers',getAllUsers);
userRouter.get('/me',(req, res) => {
    res.status(200).json({
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        // ...anything else you want
    });
});
userRouter.get('/:id',getUser);

userRouter.put('/:followUserId/follow',followUser); // Assuming you want to follow a user, you can implement the logic in the controller
userRouter.put('/:unfollowUserId/unfollow',unfollowUser); // Assuming you want to follow a user, you can implement the logic in the controller
userRouter.put('/:id',updateUser); // Assuming you want to update user details, you can implement the logic in the controller
userRouter.delete('/', deleteUser); // Assuming you want to delete a user, you can implement the logic in the controller
    


export default userRouter;
