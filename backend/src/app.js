import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRouter from './routes/authRoutes.js';
import postRouter from './routes/postRoutes.js';
import userRouter from './routes/userRoutes.js';
import profileRouter from './routes/profileRoutes.js';

import { authMiddleware } from './middlewares/authMiddleware.js';

const app = express();

// Middleware to parse JSON requests
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

//public route
app.use('/api/auth', authRouter);

//protected/private route
const protectedRoutes = express.Router();
protectedRoutes.use('/post', postRouter);
protectedRoutes.use('/user', userRouter);
protectedRoutes.use('/myProfile', profileRouter);

app.use('/api', authMiddleware, protectedRoutes);

export default app;
