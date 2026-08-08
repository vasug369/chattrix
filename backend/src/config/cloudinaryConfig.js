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

const storage = env.cloudinaryEnabled
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'chattrix_posts',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1000, crop: 'limit' }],
      },
    })
  : multer.memoryStorage();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // The Cloudinary `allowed_formats` option only rejects after the bytes have
    // been uploaded; checking here refuses non-images before that.
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
    return cb(null, true);
  },
});

export const cloudinaryEnabled = env.cloudinaryEnabled;
export default upload;
