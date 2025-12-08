import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || '10485760'); // 10MB
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE || '104857600'); // 100MB

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

// Memory storage configuration
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'));
  }
};

// File filter for videos
const videoFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MPEG, MOV, AVI, and WebM videos are allowed.'));
  }
};

// File filter for both images and videos
const mediaFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  }
};

// Multer configurations
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
  },
});

export const uploadMedia = multer({
  storage,
  fileFilter: mediaFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Use larger limit for mixed uploads
  },
});

// Profile photo upload (single image, smaller size limit)
export const uploadProfilePhoto = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});
