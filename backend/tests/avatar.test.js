import { beforeEach, describe, expect, it, vi } from 'vitest';
import User from '../src/models/user.model.js';
import * as cloudinaryConfig from '../src/config/cloudinaryConfig.js';
import { createUser } from './helpers.js';

/**
 * Cloudinary is never contacted. `cloudinaryEnabled` is false in tests (no
 * credentials), so multer falls back to memory storage and the controller
 * refuses before any bytes would leave — which is itself worth asserting,
 * because that guard is what stops a misconfigured deployment accepting
 * uploads and silently discarding them.
 *
 * The success paths call the service directly with the shape multer's
 * Cloudinary storage produces: `path` is the delivered URL, `filename` is the
 * public id.
 */
const uploadedFile = (overrides = {}) => ({
  path: 'https://res.cloudinary.com/demo/image/upload/v1/chattrix_avatars/abc.jpg',
  filename: 'chattrix_avatars/abc',
  ...overrides,
});

// Without this the destroyImage spy accumulates calls across tests in this
// file, and assertions about "was it called" become assertions about
// everything that ran before.
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('profile photo', () => {
  it('refuses uploads when Cloudinary is not configured', async () => {
    const { agent } = await createUser();

    const res = await agent
      .post('/api/user/me/avatar')
      .attach('pic', Buffer.from('not-really-a-jpeg'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);

    expect(res.body.message).toMatch(/not configured/i);
  });

  it('rejects a non-image before it is stored', async () => {
    const { agent } = await createUser();

    // multer's fileFilter runs before storage, so this never reaches the
    // controller's Cloudinary guard.
    const res = await agent
      .post('/api/user/me/avatar')
      .attach('pic', Buffer.from('%PDF-1.4'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    expect(res.body.message).toMatch(/JPEG, PNG and WebP/i);
  });

  it('stores the url and the public id, and deletes the previous image', async () => {
    const { updateAvatarService } = await import('../src/services/userService.js');
    const { user } = await createUser();

    const destroy = vi.spyOn(cloudinaryConfig, 'destroyImage').mockResolvedValue(true);

    await updateAvatarService(user._id, uploadedFile());
    let stored = await User.findById(user._id).select('+picPublicId');
    expect(stored.pic).toMatch(/res\.cloudinary\.com/);
    expect(stored.picPublicId).toBe('chattrix_avatars/abc');
    // Nothing to clean up on the first upload.
    expect(destroy).not.toHaveBeenCalled();

    await updateAvatarService(
      user._id,
      uploadedFile({ path: 'https://res.cloudinary.com/demo/v2/second.jpg', filename: 'chattrix_avatars/second' })
    );
    stored = await User.findById(user._id).select('+picPublicId');
    expect(stored.picPublicId).toBe('chattrix_avatars/second');
    // The replaced file would otherwise sit in Cloudinary forever.
    expect(destroy).toHaveBeenCalledWith('chattrix_avatars/abc');
  });

  it('clears the photo and deletes the stored file', async () => {
    const { removeAvatarService, updateAvatarService } = await import(
      '../src/services/userService.js'
    );
    const { user } = await createUser();
    const destroy = vi.spyOn(cloudinaryConfig, 'destroyImage').mockResolvedValue(true);

    await updateAvatarService(user._id, uploadedFile());
    await removeAvatarService(user._id);

    const stored = await User.findById(user._id).select('+picPublicId');
    expect(stored.pic).toBe('');
    expect(stored.picPublicId).toBe('');
    expect(destroy).toHaveBeenCalledWith('chattrix_avatars/abc');
  });

  it('never deletes a picture we do not own', async () => {
    const { removeAvatarService } = await import('../src/services/userService.js');
    const { user } = await createUser();
    const destroy = vi.spyOn(cloudinaryConfig, 'destroyImage').mockResolvedValue(true);

    // A Google avatar: a URL, but no public id, because the file is Google's.
    await User.findByIdAndUpdate(user._id, {
      pic: 'https://lh3.googleusercontent.com/photo.jpg',
      picPublicId: '',
    });

    await removeAvatarService(user._id);

    expect(destroy).not.toHaveBeenCalled();
  });

  it('no longer accepts a picture URL through the profile PATCH', async () => {
    const { agent } = await createUser();

    // Previously any URL could be set here, pointing an avatar at an arbitrary
    // host whose contents could change afterwards.
    const res = await agent
      .patch('/api/user/me')
      .send({ pic: 'https://example.com/anything.jpg' })
      .expect(422);

    expect(JSON.stringify(res.body)).toMatch(/Unrecognized key/i);
  });
});
