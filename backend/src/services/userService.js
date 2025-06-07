import User from "../models/user.model.js";

export const getUserService = async(userId)=>{
   try{
    
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
    }   catch (error) {
        // Handle errors, such as user not found or validation errors
        throw new Error('Error updating user: ' + error.message);
    }
}