import { getProfileService } from '../services/profileService.js';

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await getProfileService(userId, req.user._id);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};
