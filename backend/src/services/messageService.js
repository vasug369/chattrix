import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import { createNotification } from './notificationService.js';
import { PUBLIC_USER_EXCLUDE } from './userService.js';

export const sendMessageService = async (senderId, receiverId, message) => {
    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
        conversation = await Conversation.create({ participants: [senderId, receiverId] });
    }

    const newMessage = new Message({ senderId, receiverId, message });
    conversation.messages.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);
    await createNotification({ recipient: receiverId, sender: senderId, type: 'message' });

    return newMessage;
};

export const getMessagesService = async (senderId, receiverId) => {
    const conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
    }).populate('messages');

    return conversation ? conversation.messages : [];
};

export const getUsersForSidebarService = async (loggedInUserId) => {
    return User.find({ _id: { $ne: loggedInUserId } }).select(PUBLIC_USER_EXCLUDE);
};
