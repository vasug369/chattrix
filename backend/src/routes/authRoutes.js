import express from 'express';
import {
    forgotPassword,
    login,
    logout,
    performPasswordReset,
    refresh,
    register,
    sendVerifyOtp,
    validate,
    verifyEmail,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiters.js';
import { validate as validateRequest } from '../middlewares/validate.js';
import {
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    sendVerifyOtpSchema,
    verifyEmailSchema,
} from '../validation/auth.schema.js';

const authRouter = express.Router();

authRouter.post('/register', authLimiter, validateRequest(registerSchema), register);
authRouter.post('/login', authLimiter, validateRequest(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/validate', validate);
authRouter.post('/refresh', authMiddleware, refresh);

// Email verification
authRouter.post('/send-verify-otp', otpLimiter, validateRequest(sendVerifyOtpSchema), sendVerifyOtp);
authRouter.post('/verify-email', authLimiter, validateRequest(verifyEmailSchema), verifyEmail);

// Password reset
authRouter.post('/forgot-password', otpLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), performPasswordReset);

export default authRouter;
