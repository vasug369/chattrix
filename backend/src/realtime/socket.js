import { Server } from 'socket.io';
import env from '../config/env.js';

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

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        const userId = socket.handshake.query?.userId;
        if (!userId || userId === 'undefined' || userId === 'null') {
            socket.disconnect(true);
            return;
        }

        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);
        socket.join(roomFor(userId));

        broadcastOnlineUsers();

        socket.on('typing', ({ to }) => {
            if (to) io.to(roomFor(to)).emit('typing', { from: userId });
        });

        socket.on('stopTyping', ({ to }) => {
            if (to) io.to(roomFor(to)).emit('stopTyping', { from: userId });
        });

        socket.on('disconnect', () => {
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

/** Test helper — drops state between suites. */
export const resetSocketState = () => {
    userSockets.clear();
    io = null;
};
