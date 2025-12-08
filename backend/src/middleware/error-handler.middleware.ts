import { Request, Response, NextFunction } from 'express';
import logger from '@utils/logger';

/**
 * Custom error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  errors: any;

  constructor(message: string, errors?: any) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    error = new ValidationError('Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthError('Token expired');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ValidationError('File size too large');
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new ValidationError('Unexpected file field');
    } else {
      error = new ValidationError(err.message);
    }
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
