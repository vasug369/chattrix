import crypto from 'crypto';
import Session from '../models/session.model.js';
import { notFound } from '../utils/AppError.js';
import { disconnectSession } from '../realtime/socket.js';

/**
 * Session lifecycle: create on login, validate on every request, revoke on
 * logout / remote sign-out / password reset.
 */

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How stale `lastSeenAt` may get before a request bothers to update it.
 *
 * Writing it on every request would turn every authenticated GET into a write,
 * which is a lot of database churn to make a timestamp look precise on a page
 * users open once a year. A minute of drift is invisible in the UI.
 */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

/**
 * Derive a human label from a user agent.
 *
 * Deliberately not a full UA-parsing dependency: this only has to be good
 * enough for a person to recognise their own device in a list, and a wrong
 * guess degrades to "Unknown device" rather than to something misleading.
 */
export const describeDevice = (userAgent = '') => {
    const ua = String(userAgent);
    if (!ua) return 'Unknown device';

    const browser =
        // Order matters: Edge and Opera both claim to be Chrome, and Chrome
        // claims to be Safari, so the impostors have to be tested first.
        /\bEdg\//.test(ua) ? 'Edge'
        : /\bOPR\/|\bOpera\//.test(ua) ? 'Opera'
        : /\bFirefox\//.test(ua) ? 'Firefox'
        : /\bChrome\//.test(ua) ? 'Chrome'
        : /\bSafari\//.test(ua) ? 'Safari'
        : null;

    const os =
        /\bWindows\b/.test(ua) ? 'Windows'
        : /\bAndroid\b/.test(ua) ? 'Android'
        : /\b(iPhone|iPad|iPod)\b/.test(ua) ? 'iOS'
        : /\bMac OS X\b|\bMacintosh\b/.test(ua) ? 'macOS'
        : /\bLinux\b/.test(ua) ? 'Linux'
        : null;

    if (browser && os) return `${browser} on ${os}`;
    if (browser) return browser;
    if (os) return os;
    return 'Unknown device';
};

/** Best-effort client IP. `trust proxy` is set, so req.ip already unwraps XFF. */
export const clientIp = (req) => req.ip ?? req.socket?.remoteAddress ?? '';

export const createSession = async (userId, req) => {
    const userAgent = req?.get?.('user-agent') ?? '';

    const session = await Session.create({
        user: userId,
        // 256 bits from a CSPRNG. This is an identifier, not a secret, but it
        // must be unguessable: a predictable jti would let someone name
        // another user's session in a revoke call.
        jti: crypto.randomBytes(32).toString('hex'),
        userAgent,
        device: describeDevice(userAgent),
        ip: clientIp(req),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    return session;
};

/**
 * Resolve a jti to a live session.
 *
 * @returns {Promise<object|null>} null when the session is unknown, revoked or
 *   expired — every one of which must fail authentication.
 */
export const findLiveSession = async (jti) => {
    if (!jti) return null;

    const session = await Session.findOne({ jti });
    if (!session) return null;
    if (session.revokedAt) return null;
    // Belt and braces: the TTL monitor only runs about once a minute, so an
    // expired session can outlive its expiry by up to that long in the
    // collection. Checking the field means it never outlives it in practice.
    if (session.expiresAt.getTime() <= Date.now()) return null;

    return session;
};

/** Bump `lastSeenAt`, but only when it has actually gone stale. */
export const touchSession = async (session) => {
    const age = Date.now() - new Date(session.lastSeenAt).getTime();
    if (age < LAST_SEEN_THROTTLE_MS) return;

    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
};

export const listSessionsService = async (userId, currentJti) => {
    const sessions = await Session.find({ user: userId, revokedAt: null })
        .sort({ lastSeenAt: -1 })
        .lean();

    return sessions.map((s) => ({
        id: s._id,
        device: s.device,
        ip: s.ip,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
        // Lets the UI label one row "This device" and refuse to let you revoke
        // the session you are currently using by accident.
        current: s.jti === currentJti,
    }));
};

/**
 * Revoke one session by its public id.
 *
 * Scoped to `user`, which is what stops somebody signing out another account's
 * devices by guessing an id — the same mistake the notification read endpoint
 * would have made without its recipient filter.
 */
export const revokeSessionService = async (userId, sessionId) => {
    const session = await Session.findOneAndUpdate(
        { _id: sessionId, user: userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: true }
    );

    if (!session) throw notFound('Session not found');

    // Revoking only blocked HTTP. A socket opened before the revocation stayed
    // connected, so the signed-out device kept receiving notifications and
    // direct messages until it happened to reload.
    disconnectSession(session.jti);

    return session;
};

/** Sign out every device except the one making the request. */
export const revokeOtherSessionsService = async (userId, currentJti) => {
    // Read the jtis before updating: afterwards they no longer match the
    // "not revoked" filter, so there would be nothing left to disconnect.
    const doomed = await Session.find(
        { user: userId, revokedAt: null, jti: { $ne: currentJti } },
        { jti: 1 }
    ).lean();

    const result = await Session.updateMany(
        { user: userId, revokedAt: null, jti: { $ne: currentJti } },
        { $set: { revokedAt: new Date() } }
    );

    for (const s of doomed) disconnectSession(s.jti);

    return { revoked: result.modifiedCount ?? 0 };
};

/** Used by logout and by password reset, which must clear the lot. */
export const revokeAllSessionsService = async (userId) => {
    const doomed = await Session.find({ user: userId, revokedAt: null }, { jti: 1 }).lean();

    const result = await Session.updateMany(
        { user: userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );

    for (const s of doomed) disconnectSession(s.jti);

    return { revoked: result.modifiedCount ?? 0 };
};

/**
 * Push a session's expiry back out to a full refresh-token lifetime.
 *
 * Called when tokens are rotated, so a session that is genuinely in use does
 * not expire on a fixed schedule from its first login.
 */
export const extendSession = async (jti) => {
    if (!jti) return;
    await Session.updateOne(
        { jti, revokedAt: null },
        { $set: { expiresAt: new Date(Date.now() + REFRESH_TTL_MS), lastSeenAt: new Date() } }
    );
};

export const revokeByJti = async (jti) => {
    if (!jti) return;
    await Session.updateOne({ jti, revokedAt: null }, { $set: { revokedAt: new Date() } });
    disconnectSession(jti);
};
