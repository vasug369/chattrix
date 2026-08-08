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

const Message = mongoose.model("Message", messageSchema);
export default Message;
