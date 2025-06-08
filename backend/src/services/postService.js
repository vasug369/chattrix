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


const getUserPosts=async(userId)=>{
    try{
        const posts=await Post.find({author: userId});
        if(!posts){
            throw new Error("No posts found for this user");
        }
        return posts;

    }
    catch(error){
        throw new Error('Error fetching user posts: ' + error.message);
    }
}

const commentPost=async(req,postId)=>{
    // console.log('postId:', postId); // Debugging line
    // console.log('req.user:', req.user); // Debugging line
    try{
        const post = await Post.findById(postId);
        console.log('post:', post); // Debugging line
        if (!post) {
            throw new Error('Post not found');
        }
        post.comments.push({
            author:req.user._id,
            content: req.body.content 
        })
        post.save();
        return post;

    }
    catch(err){
        throw new Error('error commenting on post: '+err.message);

    }

}

export const createPostService = createPost;
export const getPostByIdService = getPostById;
export const getPostsService = getAllPosts;
export const updatePostService = updatePost;
export const deletePostService = deletePost;
export const getUserPostsService = getUserPosts;
export const commentPostService = commentPost;