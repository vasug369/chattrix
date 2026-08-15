import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import env from './env.js';

/**
 * Live Cloudinary credentials were previously inlined as `||` fallbacks in this
 * file and committed to git. They now come from the environment only; when they
 * are absent the app falls back to in-memory storage so uploads fail cleanly at
 * the edge rather than shipping images to somebody else's account.
 */
if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

/**
 * Build an uploader for one kind of image.
 *
 * Posts and avatars want different handling — a post image keeps its shape and
 * only gets bounded, an avatar is always shown in a circle and so is cropped
 * square up front rather than by CSS on every render.
 */
const createUploader = ({ folder, transformation }) =>
  multer({
    storage: env.cloudinaryEnabled
      ? new CloudinaryStorage({
          cloudinary,
          params: {
            folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation,
          },
        })
      : // Without credentials nothing should reach Cloudinary, but multer still
        // needs somewhere to put bytes. Memory storage means the controller's
        // `cloudinaryEnabled` guard is what actually refuses the request.
        multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      // The Cloudinary `allowed_formats` option only rejects after the bytes
      // have been uploaded; checking here refuses non-images before that.
      if (!ALLOWED_MIME.has(file.mimetype)) {
        // A plain Error here reaches the error handler with no status and is
        // reported as a 500 — so attaching a PDF looked like a server fault
        // rather than a rejected upload. Borrowing multer's own error shape
        // puts it on the existing 400 path.
        const err = new Error('Only JPEG, PNG and WebP images are allowed');
        err.name = 'MulterError';
        err.code = 'INVALID_FILE_TYPE';
        return cb(err);
      }
      return cb(null, true);
    },
  });

const upload = createUploader({
  folder: 'chattrix_posts',
  transformation: [{ width: 1000, crop: 'limit' }],
});

/**
 * Avatars are stored already square and already small. Serving a 4MB phone
 * photo scaled down by the browser wastes the visitor's bandwidth on every
 * screen it appears on — and it appears next to every post and comment.
 */
export const avatarUpload = createUploader({
  folder: 'chattrix_avatars',
  transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
});

/**
 * Best-effort removal of a previously stored image.
 *
 * Replacing an avatar otherwise leaves the old file in Cloudinary forever, and
 * a free plan has a finite quota. Never throws: failing to tidy up must not
 * fail the update the user actually asked for.
 */
export const destroyImage = async (publicId) => {
  if (!env.cloudinaryEnabled || !publicId) return false;
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (err) {
    console.error(`[cloudinary] could not delete ${publicId}:`, err.message);
    return false;
  }
};

export const cloudinaryEnabled = env.cloudinaryEnabled;
export default upload;
