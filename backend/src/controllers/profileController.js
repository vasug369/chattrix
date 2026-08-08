import { getPublicProfileService } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Profile view. Delegates to the user service so there is a single place that
 * decides which fields are public — profileService previously returned the raw
 * document, password hash included.
 */
export const getProfile = asyncHandler(async (req, res) => {
    const profile = await getPublicProfileService(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: profile });
});
