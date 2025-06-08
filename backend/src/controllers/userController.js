import e from 'express';
import {getUserService,updateUserService,followUserService,unfollowUserService, deleteUserService} from '../services/userService.js'


export const getUser=async(req,res)=>{
    try{
        const userId=req.params.id;
        const user=await getUserService(userId);
        if(!user){
            return res.status(404).json({message:"user not found"})
        }
        // console.log("User fetched successfully:", req.user);
        res.status(200).json(user);


    }
    catch(err){
        return res.status(500).json({message:err.message});


    }

}

export const getUserPost=(req,res)=>{
    try{
        const userPost=req.user._id;
        console.log("User Post fetched successfully:", userPost);
    }
    catch(err){
        return res.status(500).json({message:$`post for ${req.user.name} not found`});
    }


}

export const updateUser=async(req,res)=>{
    try{
        const userId=req.params.id;
        const updateData=req.body;
        // Assuming you have a service function to update the user
        const updatedUser=await updateUserService(userId, updateData);
        if(!updatedUser){
            return res.status(404).json({message:"user not found"})
        }
        res.status(200).json(updatedUser);

    }
    catch(err){
        return res.status(500).json({message:err.message});
    }
}


export const followUser=async(req,res)=>{
    try{
        const userId=req.user._id; // Assuming user ID is stored in req.user
        const followUserId=req.params.followUserId; // Assuming the user to follow is specified in the request parameters
        const {user,followUser}=await followUserService(userId,followUserId);
        if(!user || !followUser){
            return res.status(404).json({message:"user not found"})
        }
        res.status(200).json({message:`${user.name} followed ${followUser.name}`});

    }
    catch(err){
        return res.status(500).json({message:err.message});
    }
}


export const unfollowUser=async(req,res)=>{
    try{
        const userId=req.user._id; // Assuming user ID is stored in req.user
        const unfollowUserId=req.params.unfollowUserId; // Assuming the user to unfollow is specified in the request parameters
        const {user,unfollowUser}=await unfollowUserService(userId,unfollowUserId);
        if(!user || !unfollowUser){
            return res.status(404).json({message:"user not found"})
        }
        res.status(200).json({message:`${user.name} unfollowed ${unfollowUser.name}`});

    }
    catch(err){
        return res.status(500).json({message:err.message});
    }
}

export const deleteUser=async(req,res)=>{
    try{
        const userId=req.user._id; // Assuming user ID is stored in req.user
        // Assuming you have a service function to delete the user
        const deletedUser=await deleteUserService(userId);
        if(!deletedUser){
            return res.status(404).json({message:"user not found"})
        }
        res.status(200).json({message:"user deleted successfully"});

    }
    catch(err){
        return res.status(500).json({message:err.message});
    }
}