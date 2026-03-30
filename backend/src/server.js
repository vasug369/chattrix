import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/dbConfig.js';
import app from './app.js';

import http from 'http';
import { Server } from 'socket.io';

connectDB();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

//add https://chattrix-nmlf.vercel.app/ in cors
export const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173','https://chattrix-nmlf.vercel.app'],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    if (userId && userId !== 'undefined') {
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        if (userId) {
            delete userSocketMap[userId];
            io.emit('getOnlineUsers', Object.keys(userSocketMap));
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});