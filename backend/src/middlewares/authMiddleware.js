import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/user.model.js';
import { unauthorized } from '../utils/AppError.js';
import { accessCookieOptions } from '../services/authService.js';
import { findLiveSession, touchSession } from '../services/sessionService.js';

// The options used to be redeclared here, which is how the refreshed cookie
// ended up without the Domain attribute the login cookie had: a silent
// re-scoping halfway through a session. One definition, in authService.

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

        // tokenVersion is all-or-nothing; the jti is what lets a single device
        // be signed out while the others keep working.
        const session = await findLiveSession(decoded.jti);
        if (!session) return next(unauthorized('Session has been revoked'));
        await touchSession(session);

        req.user = user;
        req.session = session;
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

    // A device signed out remotely still holds a syntactically valid refresh
    // token. Without this check it would quietly mint itself a new access
    // token and carry on, which would make the sign-out button a lie.
    const session = await findLiveSession(decodedRefresh.jti);
    if (!session) return next(unauthorized('Session has been revoked'));
    await touchSession(session);

    // Both claims must be carried through. Minting the refreshed token without
    // tokenVersion meant `decoded.tokenVersion ?? 0` evaluated to 0 on the next
    // request, so any account whose version had been bumped by a password
    // reset failed the check above and was logged out — every 15 minutes,
    // forever, with no way back except logging in again. Dropping the jti
    // would fail the session lookup the same way.
    const newAccessToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        jti: decodedRefresh.jti,
        tokenVersion: user.tokenVersion ?? 0,
      },
      env.JWT_SECRET,
      { expiresIn: env.ACCESS_TOKEN_TTL }
    );
    res.cookie('token', newAccessToken, accessCookieOptions());

    req.user = user;
    req.session = session;
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
