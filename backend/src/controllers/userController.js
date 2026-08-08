import {
    deleteUserService,
    followUserService,
    getAllUsersService,
    getPublicProfileService,
    isFollowingService,
    searchUsersService,
    unfollowUserService,
    updateUserService,
} from '../services/userService.js';
import { notify, removeNotification } from '../services/notificationService.js';
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
    res.clearCookie('token');
    res.clearCookie('refreshToken');
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
