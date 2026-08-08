import mongoose from "mongoose";

export const NOTIFICATION_TYPES = ["like", "comment", "follow", "message"];

const notificationSchema = new mongoose.Schema(
    {
        /** Who sees this notification. */
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        /** Who caused it. */
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: NOTIFICATION_TYPES,
            required: true,
        },
        /** Present for like/comment notifications. */
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        /** Short human-readable excerpt, e.g. the comment text. */
        preview: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
        },
        readAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// The two access patterns: "newest first for this user" and "how many unread".
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

/**
 * Re-liking a post the user already liked, or following/unfollowing in a loop,
 * would otherwise spam the recipient. A partial unique index collapses repeat
 * like/follow notifications from the same actor onto the same target.
 */
notificationSchema.index(
    { recipient: 1, actor: 1, type: 1, post: 1 },
    {
        unique: true,
        partialFilterExpression: { type: { $in: ["like", "follow"] } },
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
