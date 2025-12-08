import { Request, Response, NextFunction } from 'express';
import jwtService from '@services/auth/jwt.service';
import User from '@models/User.model';
import logger from '@utils/logger';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or account deactivated.',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error: any) {
    logger.error(`Authentication error: ${error.message}`);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(token);
    
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
      };
    }

    next();
  } catch (error: any) {
    // Silently fail - just don't attach user
    next();
  }
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isEmailVerified) {
    res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this resource.',
    });
    return;
  }
  next();
};

/**
 * Middleware to check if user owns the resource
 */
export const checkResourceOwnership = (userIdField: string = 'user') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceUserId = req.body[userIdField] || req.params[userIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: 'Resource owner information missing.',
      });
      return;
    }

    if (resourceUserId !== req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};
