import {
    listNotificationsService,
    markAllReadService,
    markReadService,
    unreadCountService,
} from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
    const result = await listNotificationsService(req.user._id, req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const unreadCount = asyncHandler(async (req, res) => {
    const unread = await unreadCountService(req.user._id);
    res.status(200).json({ success: true, data: { unread } });
});

export const markRead = asyncHandler(async (req, res) => {
    const notification = await markReadService(req.user._id, req.params.id);
    res.status(200).json({ success: true, data: notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
    const result = await markAllReadService(req.user._id);
    res.status(200).json({ success: true, data: result });
});
