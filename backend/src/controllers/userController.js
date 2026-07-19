import {
    getAllUsersService,
    getUserService,
    updateUserService,
    followUserService,
    unfollowUserService,
    deleteUserService,
    searchUsersService,
} from '../services/userService.js';
import { uploadBufferToCloudinary } from '../config/cloudinaryConfig.js';

export const getUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await getUserService(userId);
        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const users = await searchUsersService(query, req.user._id);
        res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (userId !== req.user._id.toString()) {
            return res.status(403).json({ message: "You can only update your own profile" });
        }
        const updateData = req.body;
        if (req.file) {
            const result = await uploadBufferToCloudinary(req.file.buffer, 'chattrix_avatars');
            updateData.pic = result.secure_url;
        }
        const updatedUser = await updateUserService(userId, updateData);
        if (!updatedUser) {
            return res.status(404).json({ message: "user not found" });
        }
        res.status(200).json(updatedUser);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const followUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const followUserId = req.params.followUserId;
        const { user, followUser } = await followUserService(userId, followUserId);
        if (!user || !followUser) {
            return res.status(404).json({ message: "user not found" });
        }
        res.status(200).json({ message: `${user.name} followed ${followUser.name}` });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const unfollowUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const unfollowUserId = req.params.unfollowUserId;
        const { user, unfollowUser } = await unfollowUserService(userId, unfollowUserId);
        if (!user || !unfollowUser) {
            return res.status(404).json({ message: "user not found" });
        }
        res.status(200).json({ message: `${user.name} unfollowed ${unfollowUser.name}` });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const deletedUser = await deleteUserService(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: "user not found" });
        }
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        res.status(200).json({ message: "user deleted successfully" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await getAllUsersService();
        res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
