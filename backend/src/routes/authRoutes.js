import express from 'express'
import { login, logout, register, validate } from '../controllers/authController.js';
const authRouter=express.Router();

authRouter.post('/register',register);
authRouter.post('/login',login);
authRouter.get('/logout',logout);
authRouter.get('/validate',validate);
authRouter.get('/missing',validate);


export default authRouter;