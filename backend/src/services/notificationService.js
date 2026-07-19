import Notification from "../models/notification.model.js";

export const createNotification = async ({ recipient, sender, type, post }) => {
    if (recipient.toString() === sender.toString()) return null; // no self-notifications

    return Notification.create({ recipient, sender, type, post });
};

export const getNotificationsService = async (userId) => {
    return Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'name pic')
        .populate('post', 'title pic');
};

export const markNotificationReadService = async (notificationId, userId) => {
    return Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { read: true },
        { new: true }
    );
};

export const markAllNotificationsReadService = async (userId) => {
    return Notification.updateMany({ recipient: userId, read: false }, { read: true });
};

export const getUnreadCountService = async (userId) => {
    return Notification.countDocuments({ recipient: userId, read: false });
};
