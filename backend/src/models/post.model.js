import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
title: {
    type: String,
    required: true,
    trim: true,
},
content: {
    type: String,
    required: true,
},
author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
comments: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
    },
],
});
const Post = mongoose.model("Post", postSchema);
export default Post;