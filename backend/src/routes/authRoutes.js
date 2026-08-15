import express from 'express';
import {
    forgotPassword,
    googleSignIn,
    listSessions,
    login,
    logout,
    performPasswordReset,
    refresh,
    register,
    revokeOtherSessions,
    revokeSession,
    sendVerifyOtp,
    validate,
    verifyEmail,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiters.js';
import { validate as validateRequest } from '../middlewares/validate.js';
import {
    forgotPasswordSchema,
    googleSignInSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    sendVerifyOtpSchema,
    sessionIdSchema,
    verifyEmailSchema,
} from '../validation/auth.schema.js';

const authRouter = express.Router();

authRouter.post('/register', authLimiter, validateRequest(registerSchema), register);
authRouter.post('/login', authLimiter, validateRequest(loginSchema), login);
// Google sign-in. Behind authLimiter like the other credential endpoints:
// verifying an ID token is a signature check against Google's keys, and an
// unbounded stream of them is free CPU burn for an attacker.
authRouter.post('/google', authLimiter, validateRequest(googleSignInSchema), googleSignIn);
authRouter.post('/logout', logout);
authRouter.get('/validate', validate);
authRouter.post('/refresh', authMiddleware, refresh);

// Email verification
authRouter.post('/send-verify-otp', otpLimiter, validateRequest(sendVerifyOtpSchema), sendVerifyOtp);
authRouter.post('/verify-email', authLimiter, validateRequest(verifyEmailSchema), verifyEmail);

// Password reset
authRouter.post('/forgot-password', otpLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), performPasswordReset);

// Session management ("where you're logged in"). These sit behind
// authMiddleware individually rather than under the protected router, because
// the rest of this file is deliberately public.
authRouter.get('/sessions', authMiddleware, listSessions);
authRouter.delete('/sessions', authMiddleware, revokeOtherSessions);
authRouter.delete('/sessions/:id', authMiddleware, validateRequest(sessionIdSchema), revokeSession);

export default authRouter;
