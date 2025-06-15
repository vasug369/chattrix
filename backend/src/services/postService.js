import Post from "../models/post.model.js";
import User from "../models/user.model.js";
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

        const posts = await Post.find().populate('author', 'name');
        if (!posts || posts.length === 0) {
            throw new Error('No posts found');
        }
        console.log('Fetched posts:', posts); // Debugging line
        // posts.forEach(post => {
        //     console.log(`Post: ${post.title}`);
        //     console.log(`Author: ${post.author?.name || 'Unknown'}`);
        //     console.log(`Likes: ${post.likes.length}`);
        //     console.log(`Comments: ${post.comments.length}`);
        //     post.comments.forEach(comment => {
        //         console.log(` - ${comment.author?.name || 'Unknown'}: ${comment.content}`);
        //     });
        // });


        return posts;
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


const getUserPosts = async (userId) => {
    try {
        const posts = await Post.find({ author: userId });
        if (!posts) {
            throw new Error("No posts found for this user");
        }
        return posts;

    }
    catch (error) {
        throw new Error('Error fetching user posts: ' + error.message);
    }
}

const commentPost = async (req, postId) => {
    // console.log('postId:', postId); // Debugging line
    // console.log('req.user:', req.user); // Debugging line
    try {
        const post = await Post.findById(postId);
        console.log('post:', post); // Debugging line
        if (!post) {
            throw new Error('Post not found');
        }
        post.comments.push({
            author: req.user._id,
            content: req.body.content
        })
        post.save();
        return post;

    }
    catch (err) {
        throw new Error('error commenting on post: ' + err.message);

    }

}


const feedPosts = async (userId) => {
    // console.log(userId);
    console.log("herer :",req.cookies.token); // Debugging line
    try {
        const user = await User.findById(userId).populate('following','_id');
        // user.forEach(element => {
            // const posts=aw            throw new Error('Post not found');

            //     throw new Error("No posts found for this user");
            // }
            // return posts;

        // });

        let allPost=[];
        for(const followedUser of user.following){
            const posts=await Post.find({author:followedUser._id}).populate('author', 'name');
            console.log(posts);
            allPost.push(posts);
        }


        
        return allPost;

    }
    catch (err) {
        throw new Error('error fetching feed');
    }
}


const searchPosts = async (searchQuery) => {
    // console.log("ASdas");
    // console.log('Search query:', req.query.q); // Debugging line
    try {
        const searchTerm = searchQuery;
        if (!searchTerm) {
            throw new Error('Post not found');
        }


        console.log("Searching for:", searchTerm);

        
        const posts = await Post.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { content: { $regex: searchTerm, $options: 'i' } }
            ]
        }).populate('author', 'name');

        
        // console.log('Search results:', posts); // Debugging line
        // if (posts.length === 0) {
        //     throw new Error('Post not found');
        // }
        // console.log('Search query:', searchQuery); // Debugging line

        return posts;
    } catch (error) {
        throw new Error('error searching post');
    }
}
// Exporting the services for use in controllers    

export const createPostService = createPost;
export const getPostByIdService = getPostById;
export const getPostsService = getAllPosts;
export const updatePostService = updatePost;
export const deletePostService = deletePost;
export const getUserPostsService = getUserPosts;
export const commentPostService = commentPost;
export const feedPostsService = feedPosts;
export const searchPostsService = searchPosts;