import {
    createPostService,
    getPostByIdService,
    getPostsService,
    updatePostService,
    deletePostService,
    getUserPostsService,
    commentPostService,
    feedPostsService,
    searchPostsService
} from '../services/postService.js';

export const createPost = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user ID is stored in req.user
        req.body.author = userId; // Set the author field to the user's ID
        
        if (req.file) {
            req.body.pic = req.file.path; // Cloudinary secure URL
        }
        
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


export const getUserPosts = async (req, res) => {
    console.log('req.user:', req.user); // 👈 Add this

    try {
        const userId = req.user._id; // Assuming user ID is stored in req.user
        const posts = await getUserPostsService(userId);
        if (!posts) {
            return res.status(404).json({ message: "No posts found for this user" });
        }
        return res.status(200).json(posts);

    }
    catch (error) {
        return res.status(500).json({ message: error.message });
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
            return res.status(200).json({ message: 'Post disliked successfully', post, likes: post.likes });
        }

        // Add the user's ID to the likes array
        post.likes.push(userId);
        await post.save();

        res.status(200).json({ message: 'Post liked successfully', post, likes: post.likes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



export const commentPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        console.log('postId:', postId); // Debugging line
        const post = await commentPostService(req, postId);
        if (!post) {
            res.status(404).json({ message: "no post found" });
        }
        res.status(200).json(post);
    }
    catch (err) {
        return res.status(500).json(err.message);
    }

}


export const feedPosts = async (req, res) => {
    try {

        const userId = req.user._id;
        const feed = await feedPostsService(userId);
        if (!feed) {
            return res.status(404).json("feed not found");
        }
        console.log(feed);
        return res.status(200).json(feed);
    }
    catch (err) {
        return res.status(500).json(err.message);
    }
}

export const searchPosts = async (req, res) => {
    // console.log('Search query:', req.query.q); // Debugging line
    try{
        const searchQuery = req.query.q; // Assuming the search query is passed as a query parameter
        if (!searchQuery) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const posts = await searchPostsService(searchQuery);
        if (!posts || posts.length === 0) {
            return res.status(404).json({ message: 'No posts found' });
        }

        return res.status(200).json(posts);
    }
    catch (err) {
        return res.status(500).json(err.message);
    }
}