import express from 'express';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadCount,
} from '../controllers/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.put('/read-all', markAllNotificationsRead);
notificationRouter.put('/:id/read', markNotificationRead);

export default notificationRouter;
