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

        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);
        socket.join(roomFor(userId));

        // Track by session as well as by user, so one device can be cut off
        // without disturbing the user's other devices.
        const jti = socket.sessionJti;
        if (jti) {
            if (!sessionSockets.has(jti)) sessionSockets.set(jti, new Set());
            sessionSockets.get(jti).add(socket.id);
        }

        broadcastOnlineUsers();

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
            if (sockets.size === 0) userSockets.delete(userId);
            broadcastOnlineUsers();
        });
    });

    return io;
};

const roomFor = (userId) => `user:${userId}`;

const broadcastOnlineUsers = () => {
    io?.emit('getOnlineUsers', [...userSockets.keys()]);
};

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
