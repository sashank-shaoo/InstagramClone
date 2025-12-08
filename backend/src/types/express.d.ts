import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        isEmailVerified: boolean;
      };
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}

export {};
