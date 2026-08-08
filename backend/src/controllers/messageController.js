import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
// Imported from the realtime module rather than server.js — importing the
// server pulled in a listen() call and a DB connection as a side effect.
import { emitToUser } from '../realtime/socket.js';
import { notify } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/AppError.js';

export const sendMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (receiverId === senderId.toString()) throw badRequest('You cannot message yourself');

    // The previous handler never checked the recipient existed, so a bogus id
    // created a dangling conversation that no one could ever open.
    const receiver = await User.findById(receiverId).select('_id name');
    if (!receiver) throw notFound('Recipient not found');

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId], $size: 2 },
    });
    if (!conversation) {
        conversation = await Conversation.create({ participants: [senderId, receiverId] });
    }

    const newMessage = await Message.create({ senderId, receiverId, message });
    conversation.messages.push(newMessage._id);
    await conversation.save();

    emitToUser(receiverId, 'newMessage', newMessage.toJSON());

    await notify({
        recipient: receiverId,
        actor: senderId,
        type: 'message',
        preview: message.slice(0, 140),
    });

    res.status(201).json({ success: true, data: newMessage });
});

export const getMessages = asyncHandler(async (req, res) => {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { page, limit } = req.validatedQuery;

    const filter = {
        $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
        ],
    };

    // Query Message directly instead of populating the conversation's id array:
    // that array grows unboundedly and was loaded in full on every open.
    const [messages, total] = await Promise.all([
        Message.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Message.countDocuments(filter),
    ]);

    // Opening a thread marks the other side's messages as read.
    const unread = await Message.updateMany(
        { senderId: userToChatId, receiverId: myId, readAt: null },
        { $set: { readAt: new Date() } }
    );
    if (unread.modifiedCount > 0) {
        emitToUser(userToChatId, 'messagesRead', { by: myId.toString() });
    }

    res.status(200).json({
        success: true,
        items: messages.reverse(), // oldest-first for rendering
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
});

export const getUsersForSidebar = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    const users = await User.find({ _id: { $ne: myId } })
        .select('name pic bio')
        .lean();

    // Per-conversation unread counts, in one aggregate rather than one query
    // per user.
    const unreadCounts = await Message.aggregate([
        { $match: { receiverId: myId, readAt: null } },
        { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const unreadBySender = new Map(unreadCounts.map((r) => [r._id.toString(), r.count]));

    res.status(200).json({
        success: true,
        items: users.map((u) => ({ ...u, unreadCount: unreadBySender.get(u._id.toString()) ?? 0 })),
    });
});
