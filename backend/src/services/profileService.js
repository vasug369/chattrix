import User from "../models/user.model.js";
const getProfileById = async (profileId) => {
    try {
        const user = await User.findById(profileId);

        if (!user) {
            throw new Error("User not found");
        }

        return user;

    }
    catch (err) {
        throw err;

    }
}


export const getProfileService = getProfileById;