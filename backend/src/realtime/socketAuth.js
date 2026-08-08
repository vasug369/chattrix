import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import env from '../config/env.js';
import { findLiveSession } from '../services/sessionService.js';

/**
 * Authenticate a Socket.io handshake.
 *
 * The previous implementation read the user id straight out of
 * `handshake.query.userId` and trusted it. Since every socket joins a room
 * named after that id, anyone could connect claiming to be somebody else and
 * receive their notifications and direct messages — no password, no token,
 * just a different query string. The id now comes from the signed cookie the
 * browser already sends with the handshake, and the query parameter is ignored
 * entirely.
 *
 * Lives in its own module (rather than inline in socket.js) so it can be
 * tested without standing up an HTTP server and a websocket client.
 *
 * @returns {Promise<string|null>} the authenticated user id, or null.
 */
export const authenticateHandshake = async (handshake) => {
    const header = handshake?.headers?.cookie;
    if (!header) return null;

    let cookies;
    try {
        cookies = cookie.parse(header);
    } catch {
        return null;
    }

    // Only the access token is accepted. The refresh token is deliberately not
    // a fallback here: refreshing means setting a new cookie, and there is no
    // way to set a cookie on an already-open websocket. A client whose access
    // token has expired should let an ordinary HTTP request refresh it and
    // then reconnect.
    const token = cookies.token;
    if (!token) return null;

    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
        return null;
    }

    // Same session check as the HTTP path: a device that was signed out
    // remotely must not keep a live socket streaming events to it.
    const session = await findLiveSession(decoded.jti);
    if (!session) return null;

    // The session is the authority on identity, not the token body — if the
    // two ever disagreed, the row that survives revocation should win.
    if (String(session.user) !== String(decoded.id)) return null;

    return String(decoded.id);
};

/** Socket.io middleware wrapper around {@link authenticateHandshake}. */
export const socketAuthMiddleware = async (socket, next) => {
    try {
        const userId = await authenticateHandshake(socket.handshake);
        if (!userId) return next(new Error('Unauthorized'));

        // Read by the connection handler. Nothing downstream should ever look
        // at handshake.query.userId again.
        socket.userId = userId;
        return next();
    } catch {
        return next(new Error('Unauthorized'));
    }
};
