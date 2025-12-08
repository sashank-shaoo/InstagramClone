import Joi from "joi";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "./error-handler.middleware";

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new ValidationError("Validation failed", errors);
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
  username: Joi.string()
    .lowercase()
    .min(3)
    .max(30)
    .pattern(/^[a-z0-9._]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, underscores, and periods",
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 30 characters",
      "any.required": "Username is required",
    }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
  fullName: Joi.string().min(1).max(100).required().messages({
    "string.max": "Full name cannot exceed 100 characters",
    "any.required": "Full name is required",
  }),
});

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
  emailOrUsername: Joi.string().required().messages({
    "any.required": "Email or username is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

/**
 * Email verification schema
 */
export const verifyEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
});

/**
 * Password reset request schema
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

/**
 * Password reset schema
 */
export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "New password is required",
  }),
});

/**
 * Change password schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "any.required": "New password is required",
  }),
});

/**
 * Update profile schema
 */
export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).optional(),
  bio: Joi.string().max(150).allow("").optional(),
  username: Joi.string()
    .lowercase()
    .min(3)
    .max(30)
    .pattern(/^[a-z0-9._]+$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, underscores, and periods",
    }),
});

/**
 * Create post schema
 */
export const createPostSchema = Joi.object({
  caption: Joi.string().max(2200).allow("").optional(),
  hashtags: Joi.array()
    .items(
      Joi.string()
        .lowercase()
        .pattern(/^[a-z0-9_]+$/)
    )
    .max(30)
    .optional(),
  location: Joi.object({
    name: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).optional(),
  }).optional(),
});

/**
 * Update post schema
 */
export const updatePostSchema = Joi.object({
  caption: Joi.string().max(2200).allow("").optional(),
  hashtags: Joi.array()
    .items(
      Joi.string()
        .lowercase()
        .pattern(/^[a-z0-9_]+$/)
    )
    .max(30)
    .optional(),
});

/**
 * Create comment schema
 */
export const createCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required().messages({
    "string.min": "Comment cannot be empty",
    "string.max": "Comment cannot exceed 500 characters",
    "any.required": "Comment text is required",
  }),
  parentComment: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid parent comment ID",
    }),
});
