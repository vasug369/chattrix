import {
    accessCookieOptions,
    issueTokens,
    loginUser,
    refreshCookieOptions,
    registerUser,
    requestPasswordReset,
    resetPassword,
    sendVerificationOtp,
    validateAccessToken,
    verifyEmailOtp,
} from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { unauthorized } from '../utils/AppError.js';
import { toPublicUser } from '../utils/sanitize.js';

export const register = asyncHandler(async (req, res) => {
    const user = await registerUser(req.body);
    res.status(201).json({
        success: true,
        message: 'Account created. Check your email for a verification code.',
        data: toPublicUser(user),
    });
});

export const login = asyncHandler(async (req, res) => {
    const { user, token, refreshToken } = await loginUser(req.body);

    res.cookie('token', token, accessCookieOptions());
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        // The token is no longer echoed in the body: it is already set as an
        // httpOnly cookie, and returning it invites clients to stash a copy in
        // localStorage where any XSS can read it.
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            isAccountVerified: user.isAccountVerified,
        },
    });
});

export const logout = asyncHandler(async (req, res) => {
    // The refresh cookie was never cleared, so "logging out" left a token that
    // silently minted a new session on the next request.
    const options = { httpOnly: true, secure: accessCookieOptions().secure, sameSite: accessCookieOptions().sameSite };
    res.clearCookie('token', options);
    res.clearCookie('refreshToken', options);
    res.status(200).json({ success: true, message: 'Logged out' });
});

export const validate = asyncHandler(async (req, res) => {
    const decoded = validateAccessToken(req.cookies?.token);
    res.status(200).json({ success: true, authenticated: true, userId: decoded.id });
});

export const refresh = asyncHandler(async (req, res) => {
    // authMiddleware has already validated the session and loaded req.user.
    if (!req.user) throw unauthorized('Not authenticated');
    const { token, refreshToken } = issueTokens(req.user);
    res.cookie('token', token, accessCookieOptions());
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());
    res.status(200).json({ success: true, message: 'Session refreshed' });
});

export const sendVerifyOtp = asyncHandler(async (req, res) => {
    await sendVerificationOtp(req.body.email);
    res.status(200).json({
        success: true,
        message: 'If that account exists and is unverified, a code is on its way.',
    });
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const { alreadyVerified } = await verifyEmailOtp(req.body);
    res.status(200).json({
        success: true,
        message: alreadyVerified ? 'Account is already verified' : 'Email verified successfully',
    });
});

export const forgotPassword = asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email);
    res.status(200).json({
        success: true,
        message: 'If that account exists, a reset code is on its way.',
    });
});

export const performPasswordReset = asyncHandler(async (req, res) => {
    await resetPassword(req.body);
    // The reset bumped tokenVersion; drop this browser's cookies too so the
    // user is forced through a clean login.
    const options = { httpOnly: true, secure: accessCookieOptions().secure, sameSite: accessCookieOptions().sameSite };
    res.clearCookie('token', options);
    res.clearCookie('refreshToken', options);
    res.status(200).json({ success: true, message: 'Password reset successfully. Please sign in.' });
});
