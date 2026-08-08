import express from 'express';
import {
    listNotifications,
    markAllRead,
    markRead,
    unreadCount,
} from '../controllers/notificationController.js';
import { validate } from '../middlewares/validate.js';
import { notificationIdSchema, notificationListSchema } from '../validation/message.schema.js';

const notificationRouter = express.Router();

notificationRouter.get('/', validate(notificationListSchema), listNotifications);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.patch('/read-all', markAllRead);
notificationRouter.patch('/:id/read', validate(notificationIdSchema), markRead);

export default notificationRouter;
