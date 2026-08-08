import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    createdAt: {
        // `default: Date.now()` (with the call) evaluated once at module load,
        // so every comment ever created shared the timestamp of server start.
        // Passing the function defers evaluation to insert time.
        type: Date,
        default: Date.now,
    },
    /** Denormalised commenter name, so rendering a thread needs no extra populate. */
    name: {
        type: String,
        trim: true,
    },
});

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    pic: {
        type: String,
        default: "",
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    comments: [commentSchema],
});

// Feed and profile queries both sort by recency within an author set.
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
export default Post;
