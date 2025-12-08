import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "500"), // 500 requests per window (increased for dev)
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window (increased for dev)
  message:
    "Too many authentication attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Email sending rate limiter (per IP)
export const emailLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || "3600000"), // 1 hour
  max: parseInt(process.env.EMAIL_RATE_LIMIT_PER_USER || "5"),
  message: "Too many emails sent, please try again later.",
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || "unknown";
  },
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: "Too many uploads, please try again later.",
  skipSuccessfulRequests: false,
});

// Comment/Like rate limiter (anti-spam)
export const actionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 actions per minute
  message: "You are doing that too fast, please slow down.",
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: "Too many password reset attempts, please try again after an hour.",
});
