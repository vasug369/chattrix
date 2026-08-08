import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/user.model.js';
import { unauthorized } from '../utils/AppError.js';

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'None' : 'Lax',
  maxAge: 15 * 60 * 1000,
});

/**
 * Authenticate via the access-token cookie, transparently refreshing it when
 * it has expired and a valid refresh token is present.
 *
 * Three bugs are fixed relative to the previous version:
 *
 * 1. A malformed (as opposed to expired) token fell through the inner catch
 *    without calling next() or sending a response, so the request hung until
 *    the client timed out. Every path here now terminates.
 * 2. The refresh branch verified the refresh token but never confirmed the
 *    user still existed, so a deleted account kept a working session.
 * 3. `console.log(req)` on every request dumped the entire request object
 *    (including cookies and headers) into the server logs.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    const refreshToken = req.cookies?.refreshToken;

    if (!token && !refreshToken) {
      return next(unauthorized('Not authenticated'));
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return next(unauthorized('Account no longer exists'));
        // Checked here too, not just on the refresh path: otherwise a password
        // reset left the existing access token usable until it expired.
        if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
          return next(unauthorized('Session has been revoked'));
        }
        req.user = user;
        return next();
      } catch (err) {
        // Anything other than plain expiry is not recoverable by refreshing.
        if (err.name !== 'TokenExpiredError' || !refreshToken) {
          return next(unauthorized('Invalid or expired session'));
        }
      }
    }

    if (!refreshToken) return next(unauthorized('Not authenticated'));

    let decodedRefresh;
    try {
      decodedRefresh = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      return next(unauthorized('Invalid or expired refresh token'));
    }

    const user = await User.findById(decodedRefresh.id);
    if (!user) return next(unauthorized('Account no longer exists'));

    // A password reset bumps tokenVersion, retiring refresh tokens minted
    // before it.
    if ((decodedRefresh.tokenVersion ?? 0) !== user.tokenVersion) {
      return next(unauthorized('Session has been revoked'));
    }

    const newAccessToken = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.ACCESS_TOKEN_TTL }
    );
    res.cookie('token', newAccessToken, accessCookieOptions());

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Routes that require a verified email address, not merely a session. */
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.isAccountVerified) {
    return next(unauthorized('Please verify your email address to continue'));
  }
  return next();
};

export default authMiddleware;
