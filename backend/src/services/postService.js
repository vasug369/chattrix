import Post from "../models/post.model.js";
const createPost = async (data) => {
    try {
        const post = new Post(data);
        return await post.save();
    } catch (error) {
        throw new Error('Error creating post: ' + error.message);
    }
};

const getPostById = async (postId) => {
    try {
        return await Post.findById(postId);
    } catch (error) {
        throw new Error('Error fetching post: ' + error.message);
    }
};

const getAllPosts = async () => {
    try {
        return await Post.find();
    } catch (error) {
        throw new Error('Error fetching posts: ' + error.message);
    }
};

const updatePost = async (postId, data) => {
    try {
        return await Post.findByIdAndUpdate(postId, data, { new: true });
    } catch (error) {
        throw new Error('Error updating post: ' + error.message);
    }
};

const deletePost = async (postId) => {
    try {
        return await Post.findByIdAndDelete(postId);
    } catch (error) {
        throw new Error('Error deleting post: ' + error.message);
    }
};

export const createPostService = createPost;
export const getPostByIdService = getPostById;
export const getPostsService = getAllPosts;
export const updatePostService = updatePost;
export const deletePostService = deletePost;
