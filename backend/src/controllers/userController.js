import {
    deleteUserService,
    followUserService,
    getAllUsersService,
    getPublicProfileService,
    isFollowingService,
    removeAvatarService,
    searchUsersService,
    unfollowUserService,
    updateAvatarService,
    updateUserService,
} from '../services/userService.js';
import { cookieBase } from '../services/authService.js';
import { cloudinaryEnabled } from '../config/cloudinaryConfig.js';
import { notify, removeNotification } from '../services/notificationService.js';
import { badRequest } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            pic: req.user.pic,
            bio: req.user.bio,
            isAccountVerified: req.user.isAccountVerified,
            followerCount: req.user.followers?.length ?? 0,
            followingCount: req.user.following?.length ?? 0,
        },
    });
});

export const getUser = asyncHandler(async (req, res) => {
    const profile = await getPublicProfileService(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: profile });
});

/**
 * Update the caller's own profile.
 *
 * The user id comes from `req.user`, not `req.params` — the previous handler
 * took it from the URL, so `PUT /api/user/<anyone-elses-id>` updated their
 * account.
 */
export const updateMe = asyncHandler(async (req, res) => {
    const updated = await updateUserService(req.user._id, req.body);
    res.status(200).json({ success: true, data: updated });
});

/**
 * Replace the signed-in user's profile photo with an uploaded file.
 *
 * multipart/form-data, field name `pic`. The image goes to Cloudinary, never
 * to this server's disk — Render's filesystem is ephemeral, so anything
 * written locally disappears on the next deploy or spin-down, taking every
 * uploaded avatar with it.
 */
export const updateMyAvatar = asyncHandler(async (req, res) => {
    // Checked before touching the file: without credentials multer falls back
    // to memory storage, so the bytes would be accepted and silently dropped.
    if (!cloudinaryEnabled) throw badRequest('Image uploads are not configured on this server');

    const updated = await updateAvatarService(req.user._id, req.file);
    res.status(200).json({ success: true, message: 'Profile photo updated', data: updated });
});

export const removeMyAvatar = asyncHandler(async (req, res) => {
    const updated = await removeAvatarService(req.user._id);
    res.status(200).json({ success: true, message: 'Profile photo removed', data: updated });
});

export const followUser = asyncHandler(async (req, res) => {
    const { user, followUser } = await followUserService(req.user._id, req.params.followUserId);

    await notify({
        recipient: followUser._id,
        actor: user._id,
        type: 'follow',
        preview: `${user.name} started following you`,
    });

    res.status(200).json({
        success: true,
        message: `You are now following ${followUser.name}`,
        data: { isFollowing: true },
    });
});

export const unfollowUser = asyncHandler(async (req, res) => {
    const { user, unfollowUser: target } = await unfollowUserService(
        req.user._id,
        req.params.unfollowUserId
    );

    await removeNotification({ recipient: target._id, actor: user._id, type: 'follow' });

    res.status(200).json({
        success: true,
        message: `You unfollowed ${target.name}`,
        data: { isFollowing: false },
    });
});

export const isFollowing = asyncHandler(async (req, res) => {
    const following = await isFollowingService(req.user._id, req.params.id);
    res.status(200).json({ success: true, data: { isFollowing: following } });
});

export const deleteMe = asyncHandler(async (req, res) => {
    await deleteUserService(req.user._id);
    // clearCookie only matches a cookie whose attributes it repeats. Called
    // bare, it cleared nothing in production — the deleted account's browser
    // kept working cookies until they expired.
    const options = cookieBase();
    res.clearCookie('token', options);
    res.clearCookie('refreshToken', options);
    res.status(200).json({ success: true, message: 'Account deleted' });
});

export const getAllUsers = asyncHandler(async (req, res) => {
    const result = await getAllUsersService(req.validatedQuery);
    res.status(200).json({ success: true, ...result });
});

export const searchUsers = asyncHandler(async (req, res) => {
    const { q, ...pagination } = req.validatedQuery;
    const result = await searchUsersService(q, pagination, req.user._id);
    res.status(200).json({ success: true, ...result });
});
