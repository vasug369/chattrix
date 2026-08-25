import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    /** Set when the recipient opens the conversation — drives read receipts. */
    readAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

messageSchema.index({ receiverId: 1, readAt: 1 });

/**
 * A thread page is `$or` of the two directions, sorted newest-first.
 *
 * With only the single-field indexes on senderId and receiverId, Mongo scanned
 * both, unioned them, and then sorted the union in memory: 400 documents
 * examined to return a page of 20, growing with the length of the
 * conversation rather than the size of the page. A blocking sort is also
 * capped at 32MB, above which the query does not slow down, it fails.
 *
 * One index per direction, each ending in createdAt, means each branch of the
 * $or is already in sort order and the union is a merge rather than a sort.
 *
 * _id is the last key because createdAt alone does not order the thread
 * uniquely: it has millisecond resolution, so two messages sent in the same
 * millisecond tie, and the two branches of the $or were free to break that tie
 * differently. Under skip-based paging an ambiguous order is not cosmetic — a
 * message can land on two consecutive pages, or on neither.
 */
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
