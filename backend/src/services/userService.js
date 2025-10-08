import User from "../models/user.model.js";

export const getUserService = async (userId) => {
    try {

        // console.log("Fetching user with ID:", userId);

        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    catch (error) {
        throw new Error("Error fetching user: " + error.message);
    }
}


export const updateUserService = async (userId, data) => {
    try {
        // Find the user by ID and update with the provided data
        const updatedUser = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
        if (!updatedUser) {
            throw new Error('User not found');
        }
        // Return the updated user object
        return updatedUser;
    } catch (error) {
        // Handle errors, such as user not found or validation errors
        throw new Error('Error updating user: ' + error.message);
    }
}


export const followUserService = async (userId, followUserId) => {
    try {
        // console.log("User ID:", userId);
        // console.log("Follow User ID:", followUserId);   
        const user = await User.findById(userId);
        const followUser = await User.findById(followUserId);
        if (!user || !followUser) {
            throw new Error('User or follow user not found');
        }
        // console.log(user._id, followUser._id);

        if (!followUser.followers.some(id => id.toString() === user._id.toString())) {
            followUser.followers.push(user._id);
        }

        if (!user.following.some(id => id.toString() === followUser._id.toString())) {
            console.log('Pushing followUser._id to user.following:', followUser._id.toString());

            user.following.push(followUser._id);
        }
        await followUser.save();
        await user.save();
        return { user, followUser };
    }
    catch (error) {
        throw new Error('Error following user: ' + error.message);
    }
}


export const unfollowUserService = async (userId, unfollowUserId) => {
    try{
        const user=await User.findById(userId);
        const unfollowUser=await User.findById(unfollowUserId);
        if(!user || !unfollowUser){
            throw new Error('User or unfollow user not found');
        }
        // Remove the unfollowUser from user's following list
        user.following = user.following.filter(id => id.toString() !== unfollowUser._id.toString());
        // Remove the user from unfollowUser's followers list
        unfollowUser.followers = unfollowUser.followers.filter(id => id.toString() !== user._id.toString());
        await user.save();
        await unfollowUser.save();
        return { user, unfollowUser };
    }
    catch (error) {
        throw new Error('Error unfollowing user: ' + error.message);
    }
}


export const deleteUserService = async (userId) => {
    try{
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            throw new Error('User not found');
        }
        return deletedUser;
    }
    catch (error) {
        throw new Error('Error deleting user: ' + error.message);
    }
}

export const getAllUsersService = async () => {
    try {
        const users = await User.find({});
        if (!users || users.length === 0) {
            throw new Error('No users found');
        }
        return users;
    } catch (error) {
        throw new Error('Error fetching all users: ' + error.message);
    }
}


export const getIsFollowingService=async(currentUserId,targetUserId)=>{
    try{
        const targetUser = await User.findById(targetUserId).select('followers');
        // const isFollowing=(await User.find(targetUserId)).includes()
        const followersAsString = targetUser?.followers.map(id => id.toString());
        const currentIdStr = currentUserId.toString();

        // console.log(targetUser.followers);
        // console.log(typeof(currentUserId));
        return followersAsString?.includes(currentIdStr);;
    }
    catch(error){
        throw new Error(error.message);

    }
}

