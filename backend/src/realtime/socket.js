import { Server } from 'socket.io';
import env from '../config/env.js';
import { socketAuthMiddleware } from './socketAuth.js';

/**
 * Socket.io lives here rather than in server.js so that importing the Express
 * app does not start an HTTP listener.
 *
 * messageController used to `import { io } from '../server.js'`, which meant
 * any test that imported a route also bound a port and opened a Mongo
 * connection. Handlers now depend on this module instead, and it is a no-op
 * until initSocket() is called.
 */

/** @type {import('socket.io').Server | null} */
let io = null;

/** userId -> Set of socket ids (a user may have several tabs open). */
const userSockets = new Map();

/**
 * jti -> Set of socket ids.
 *
 * The handshake is authenticated, but only once. Without this, a socket opened
 * before a session was revoked stayed connected indefinitely: the device could
 * no longer act (every HTTP request 401s) but carried on *receiving* — live
 * notifications and incoming direct messages — until the user happened to
 * reload. Signing a device out has to close its socket too.
 */
const sessionSockets = new Map();

/**
 * Presence wire format.
 *
 * `sync` carries the whole online list and goes to one socket, on connect.
 * `online`/`offline` carry a single user id and go to everyone, and only when
 * a user actually crosses the online boundary — not on every extra tab.
 */
export const PRESENCE_SYNC = 'presence:sync';
export const PRESENCE_ONLINE = 'presence:online';
export const PRESENCE_OFFLINE = 'presence:offline';

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Rejects the connection before `connection` ever fires if the handshake
    // cookie is missing, invalid, or names a revoked session.
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        // Set by socketAuthMiddleware from the verified token. Reading
        // handshake.query.userId here instead was the vulnerability: it let a
        // client pick whose events it received.
        const userId = socket.userId;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        // Whether this connection is what brings the user online, as opposed
        // to a second tab for someone already connected. Has to be read before
        // the socket is recorded, and it is what keeps the delta below from
        // firing once per tab.
        const isFirstSocket = !userSockets.has(userId);

        if (isFirstSocket) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);
        socket.join(roomFor(userId));

        // Track by session as well as by user, so one device can be cut off
        // without disturbing the user's other devices.
        const jti = socket.sessionJti;
        if (jti) {
            if (!sessionSockets.has(jti)) sessionSockets.set(jti, new Set());
            sessionSockets.get(jti).add(socket.id);
        }

        // Presence: one snapshot to the socket that just arrived, then single
        // user ids to everyone else as people come and go.
        //
        // This was an io.emit() of the entire online list on every connect and
        // every disconnect, which costs N ids delivered to N recipients. At 100
        // users online that is ~270KB per connect; at 1000 it is ~27MB, and
        // ordinary tab churn saturates the instance's network long before
        // anything else on the box is under load.
        //
        // The list still goes out under the old event name, but only to the
        // socket that just connected. A tab left open across this deploy gets a
        // correct list once and then stops updating, rather than showing nobody.
        const snapshot = [...userSockets.keys()];
        socket.emit(PRESENCE_SYNC, snapshot);
        socket.emit('getOnlineUsers', snapshot);

        if (isFirstSocket) socket.broadcast.emit(PRESENCE_ONLINE, userId);

        socket.on('typing', ({ to }) => {
            if (to) io.to(roomFor(to)).emit('typing', { from: userId });
        });

        socket.on('stopTyping', ({ to }) => {
            if (to) io.to(roomFor(to)).emit('stopTyping', { from: userId });
        });

        socket.on('disconnect', () => {
            const bySession = sessionSockets.get(socket.sessionJti);
            if (bySession) {
                bySession.delete(socket.id);
                if (bySession.size === 0) sessionSockets.delete(socket.sessionJti);
            }

            const sockets = userSockets.get(userId);
            if (!sockets) return;
            sockets.delete(socket.id);
            // Only report the user offline once their last tab closes —
            // the previous single-socket map marked them offline on the first
            // disconnect even if other tabs were still connected.
            if (sockets.size === 0) {
                userSockets.delete(userId);
                io?.emit(PRESENCE_OFFLINE, userId);
            }
        });
    });

    return io;
};

const roomFor = (userId) => `user:${userId}`;

export const getOnlineUserIds = () => [...userSockets.keys()];

export const isUserOnline = (userId) => userSockets.has(String(userId));

/** Emit to every socket a user has open. Safe before initSocket(). */
export const emitToUser = (userId, event, payload) => {
    if (!io || !userId) return false;
    io.to(roomFor(String(userId))).emit(event, payload);
    return true;
};

export const getIO = () => io;

/**
 * Close every socket belonging to a revoked session.
 *
 * Called whenever a session is revoked, so a signed-out device stops receiving
 * events immediately rather than at its next reload. The client is told why
 * before the socket closes, so it can drop to the login screen instead of
 * silently reconnecting in a loop.
 *
 * Single-instance only: sockets live in this process's memory, so with more
 * than one server the revoked device stays connected to whichever instance
 * holds it. Doing this properly across instances needs the Socket.io Redis
 * adapter, which is the same prerequisite as scaling presence.
 *
 * @returns {number} how many sockets were closed
 */
export const disconnectSession = (jti) => {
    if (!io || !jti) return 0;

    const socketIds = sessionSockets.get(jti);
    if (!socketIds || socketIds.size === 0) return 0;

    // Copied, because disconnecting mutates the set through the disconnect
    // handler while we are iterating it.
    const ids = [...socketIds];
    for (const id of ids) {
        const socket = io.sockets.sockets.get(id);
        if (!socket) continue;
        socket.emit('session:revoked', { reason: 'This device was signed out' });
        socket.disconnect(true);
    }

    sessionSockets.delete(jti);
    return ids.length;
};

/** Test helper — drops state between suites. */
export const resetSocketState = () => {
    userSockets.clear();
    sessionSockets.clear();
    io = null;
};
