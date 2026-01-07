import {getProfileService} from '../services/profileService.js';

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await getProfileService(userId);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// export const updateProfile = async (req, res) => {
//     try {
//         const userId = req.params.id;
//         const updatedData = req.body;
//         const updatedProfile = await ProfileService.updateProfileById(userId, updatedData);
//         if (!updatedProfile) {
//             return res.status(404).json({ message: 'Profile not found' });
//         }
//         res.status(200).json(updatedProfile);
//     } catch (error) {
//         console.error('Error updating profile:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };

// export const deleteProfile = async (req, res) => {
//     try {
//         const userId = req.params.id;
//         const deleted = await ProfileService.deleteProfileById(userId);
//         if (!deleted) {
//             return res.status(404).json({ message: 'Profile not found' });
//         }
//         res.status(200).json({ message: 'Profile deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting profile:', error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };
