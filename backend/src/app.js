import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import env from './config/env.js';
import authRouter from './routes/authRoutes.js';
import postRouter from './routes/postRoutes.js';
import userRouter from './routes/userRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';

import { authMiddleware } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiters.js';

const app = express();

// Behind Render/Vercel proxies, so rate limiting sees the real client IP.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// A body limit: without one, a single request could buffer unbounded JSON.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use(
    cors({
        // Reflect only allow-listed origins. `credentials: true` with a
        // wildcard origin is rejected by browsers anyway, so an unknown origin
        // gets no CORS headers rather than a permissive one.
        origin(origin, callback) {
            if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
    })
);

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, status: 'ok', uptime: process.uptime() });
});

// Public
app.use('/api/auth', authRouter);

// Everything below requires a session.
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
