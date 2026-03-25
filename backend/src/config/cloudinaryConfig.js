import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Default fallback configuration in case .env doesn't have these yet
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df7pwlxo2',
  api_key: process.env.CLOUDINARY_API_KEY || '629828552697914',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'g3rJ_C2ZIfxRY5s6aDWeHtcF05U',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chattrix_posts',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }],
  },
});

const upload = multer({ storage: storage });

export default upload;
