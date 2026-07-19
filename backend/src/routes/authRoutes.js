import express from 'express';
import { body } from 'express-validator';
import {
    login,
    logout,
    register,
    validate,
    sendVerifyOtpHandler,
    verifyEmailHandler,
    sendResetOtpHandler,
    resetPasswordHandler,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate as handleValidation } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const authRouter = express.Router();

const registerValidators = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidators = [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

authRouter.post('/register', authLimiter, registerValidators, handleValidation, register);
authRouter.post('/login', authLimiter, loginValidators, handleValidation, login);
authRouter.get('/logout', logout);
authRouter.get('/validate', validate);

// Email verification — user must already be logged in
authRouter.post('/send-verify-otp', authMiddleware, sendVerifyOtpHandler);
authRouter.post('/verify-email', authMiddleware, verifyEmailHandler);

// Password reset — user is logged out, identifies via email
authRouter.post('/send-reset-otp', authLimiter, sendResetOtpHandler);
authRouter.post('/reset-password', authLimiter, resetPasswordHandler);

export default authRouter;
