import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRouter from './routes/authRoutes.js';
import postRouter from './routes/postRoutes.js';
import userRouter from './routes/userRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';

import { authMiddleware } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { corsOrigins } from './config/corsConfig.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// public routes
app.use('/api/auth', authRouter);

// protected routes
const protectedRoutes = express.Router();
protectedRoutes.use('/post', postRouter);
protectedRoutes.use('/user', userRouter);
protectedRoutes.use('/myProfile', profileRouter);
protectedRoutes.use('/messages', messageRouter);
protectedRoutes.use('/notifications', notificationRouter);

app.use('/api', authMiddleware, protectedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
