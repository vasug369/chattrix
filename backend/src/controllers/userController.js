import {getUserService,updateUserService} from '../services/userService.js'


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
