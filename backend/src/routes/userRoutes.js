import express from "express";
import {getUser,updateUser} from '../controllers/userController.js';
const userRouter = express.Router();

userRouter.get('/:id',getUser);
userRouter.put('/:id',updateUser); // Assuming you want to update user details, you can implement the logic in the controller



export default userRouter;