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
import { signInWithGoogle } from '../services/googleAuthService.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
    extendSession,
    listSessionsService,
    revokeByJti,
    revokeOtherSessionsService,
    revokeSessionService,
} from '../services/sessionService.js';
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
    // `req` is passed through so the session row can record the device and IP
    // this login came from.
    const { user, token, refreshToken } = await loginUser(req.body, req);

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

/**
 * Sign in with Google.
 *
 * Ends in exactly the same place as password login — same cookies, same
 * session row — so everything downstream (authMiddleware, the sessions list,
 * remote sign-out) works without knowing which door the user came through.
 */
export const googleSignIn = asyncHandler(async (req, res) => {
    const { user, token, refreshToken, isNewAccount } = await signInWithGoogle(
        req.body.credential,
        req
    );

    res.cookie('token', token, accessCookieOptions());
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    res.status(isNewAccount ? 201 : 200).json({
        success: true,
        message: isNewAccount ? 'Account created with Google' : 'Logged in with Google',
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            isAccountVerified: user.isAccountVerified,
            isNewAccount,
        },
    });
});

export const logout = asyncHandler(async (req, res) => {
    // Clearing cookies only disarms the browser that asked. Revoking the
    // session row is what makes the tokens themselves useless, so a copy
    // captured before logout cannot be replayed afterwards.
    //
    // The jti is read straight from the token rather than from req.user,
    // because logout is deliberately not behind authMiddleware: signing out
    // has to work even when the access token has already expired.
    const jti = readJti(req.cookies?.token, env.JWT_SECRET)
        ?? readJti(req.cookies?.refreshToken, env.JWT_REFRESH_SECRET);
    await revokeByJti(jti);

    // The refresh cookie was never cleared, so "logging out" left a token that
    // silently minted a new session on the next request.
    const options = { httpOnly: true, secure: accessCookieOptions().secure, sameSite: accessCookieOptions().sameSite };
    res.clearCookie('token', options);
    res.clearCookie('refreshToken', options);
    res.status(200).json({ success: true, message: 'Logged out' });
});

/**
 * Pull the jti out of a token without caring whether it has expired.
 *
 * An expired token still names its session correctly, and logging out with an
 * expired access token is the normal case rather than an edge case.
 */
const readJti = (token, secret) => {
    if (!token) return null;
    try {
        return jwt.verify(token, secret, { ignoreExpiration: true })?.jti ?? null;
    } catch {
        // A token that fails signature verification names nothing.
        return null;
    }
};

export const listSessions = asyncHandler(async (req, res) => {
    const sessions = await listSessionsService(req.user._id, req.session?.jti);
    res.status(200).json({ success: true, data: sessions });
});

export const revokeSession = asyncHandler(async (req, res) => {
    const session = await revokeSessionService(req.user._id, req.params.id);

    // If a user revokes the device they are currently using, treat it as a
    // logout rather than leaving them holding cookies that no longer work.
    if (req.session && String(session._id) === String(req.session._id)) {
        const options = { httpOnly: true, secure: accessCookieOptions().secure, sameSite: accessCookieOptions().sameSite };
        res.clearCookie('token', options);
        res.clearCookie('refreshToken', options);
    }

    res.status(200).json({ success: true, message: 'Session signed out' });
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
    const { revoked } = await revokeOtherSessionsService(req.user._id, req.session?.jti);
    res.status(200).json({
        success: true,
        message: revoked === 1 ? 'Signed out 1 other device' : `Signed out ${revoked} other devices`,
        data: { revoked },
    });
});

export const validate = asyncHandler(async (req, res) => {
    const decoded = validateAccessToken(req.cookies?.token);
    res.status(200).json({ success: true, authenticated: true, userId: decoded.id });
});

export const refresh = asyncHandler(async (req, res) => {
    // authMiddleware has already validated the session and loaded req.user.
    if (!req.user) throw unauthorized('Not authenticated');

    // Same session, new tokens: reusing the jti is what keeps this device as
    // one row in the sessions list instead of spawning a new entry every
    // fifteen minutes. The row's expiry is pushed out to match the refresh
    // token being minted, so an actively used session does not die on the
    // seventh day after its first login.
    const jti = req.session?.jti;
    await extendSession(jti);

    const { token, refreshToken } = issueTokens(req.user, jti);
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
