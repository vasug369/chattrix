import {
    getNotificationsService,
    markNotificationReadService,
    markAllNotificationsReadService,
    getUnreadCountService,
} from '../services/notificationService.js';

export const getNotifications = async (req, res) => {
    try {
        const notifications = await getNotificationsService(req.user._id);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const notification = await markNotificationReadService(req.params.id, req.user._id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await markAllNotificationsReadService(req.user._id);
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const count = await getUnreadCountService(req.user._id);
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
