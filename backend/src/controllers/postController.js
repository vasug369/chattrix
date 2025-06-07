import {
    createPostService,
    getPostByIdService,
    getPostsService,
    updatePostService,
    deletePostService,
    getUserPostsService
} from '../services/postService.js';

export const createPost = async (req, res) => {
    try {
        const postData = req.body;
        const newPost = await createPostService(postData);
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPosts = async (req, res) => {
    try {
        const posts = await getPostsService();
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPostById = async (req, res) => {
    // console.log('req.params:', req.params); // 👈 Add this
    try {
        const postId = req.params.id;
        const post = await getPostByIdService(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const updateData = req.body;
        const updatedPost = await updatePostService(postId, updateData);
        if (!updatedPost) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const deleted = await deletePostService(postId);
        if (!deleted) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getUserPosts=async (req, res) => {
    console.log('req.user:', req.user); // 👈 Add this

    try{
        const userId=req.user._id; // Assuming user ID is stored in req.user
        const posts=await getUserPostsService(userId);
        if(!posts){
            return res.status(404).json({message: "No posts found for this user"});
        }
        return res.status(200).json(posts);

    }
    catch(error){
        return res.status(500).json({message: error.message});
    }

}


export const likePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user._id; // Assuming user ID is stored in req.user

        // Find the post by ID
        const post = await getPostByIdService(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if the user has already liked the post
        if (post.likes.includes(userId)) {
            // If the user has already liked the post, remove their like (dislike)
            post.likes = post.likes.filter(id => id.toString() !== userId.toString());
            await post.save();
            return res.status(200).json({ message: 'Post disliked successfully', post ,likes: post.likes});
        }

        // Add the user's ID to the likes array
        post.likes.push(userId);
        await post.save();

        res.status(200).json({ message: 'Post liked successfully', post,likes: post.likes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
