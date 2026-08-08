import Notification from '../models/notification.model.js';
import { notFound } from '../utils/AppError.js';
import { emitToUser } from '../realtime/socket.js';

const ACTOR_FIELDS = 'name pic';

/**
 * Record a notification and push it to the recipient over Socket.io.
 *
 * Never throws: a notification is a side effect of the action that triggered
 * it, so a failure here must not turn a successful "like" into a 500. Failures
 * are logged and swallowed.
 *
 * @returns {Promise<object|null>} the notification, or null if it was skipped
 */
export const notify = async ({ recipient, actor, type, post = null, preview = '' }) => {
    try {
        // Nobody wants to be told they liked their own post.
        if (!recipient || !actor || recipient.toString() === actor.toString()) return null;

        // For like/follow the unique partial index collapses repeats, so an
        // upsert refreshes the existing row (and re-flags it unread) instead of
        // stacking duplicates every time someone toggles a like.
        const isCollapsible = type === 'like' || type === 'follow';

        let doc;
        if (isCollapsible) {
            doc = await Notification.findOneAndUpdate(
                { recipient, actor, type, post },
                { $set: { preview, readAt: null, createdAt: new Date() } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } else {
            doc = await Notification.create({ recipient, actor, type, post, preview });
        }

        const populated = await doc.populate('actor', ACTOR_FIELDS);
        emitToUser(recipient, 'notification:new', populated.toJSON());

        const unread = await unreadCountService(recipient);
        emitToUser(recipient, 'notification:count', { unread });

        return populated;
    } catch (err) {
        console.error('[notify] failed:', err.message);
        return null;
    }
};

/** Undo a collapsible notification, e.g. when a like or follow is withdrawn. */
export const removeNotification = async ({ recipient, actor, type, post = null }) => {
    try {
        if (!recipient || !actor) return;
        await Notification.deleteOne({ recipient, actor, type, post });
        const unread = await unreadCountService(recipient);
        emitToUser(recipient, 'notification:count', { unread });
    } catch (err) {
        console.error('[notify:remove] failed:', err.message);
    }
};

export const listNotificationsService = async (userId, { page, limit, unreadOnly }) => {
    const filter = { recipient: userId, ...(unreadOnly ? { readAt: null } : {}) };

    const [items, total, unread] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('actor', ACTOR_FIELDS)
            .populate('post', 'title')
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ recipient: userId, readAt: null }),
    ]);

    return {
        items,
        unread,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
};

export const unreadCountService = (userId) =>
    Notification.countDocuments({ recipient: userId, readAt: null });

export const markReadService = async (userId, notificationId) => {
    // Scoping the update to `recipient` is what stops one user marking another
    // user's notifications as read by guessing an id.
    const updated = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { $set: { readAt: new Date() } },
        { new: true }
    );
    if (!updated) throw notFound('Notification not found');

    const unread = await unreadCountService(userId);
    emitToUser(userId, 'notification:count', { unread });
    return updated;
};

export const markAllReadService = async (userId) => {
    const result = await Notification.updateMany(
        { recipient: userId, readAt: null },
        { $set: { readAt: new Date() } }
    );
    emitToUser(userId, 'notification:count', { unread: 0 });
    return { modified: result.modifiedCount ?? 0 };
};
