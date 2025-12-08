import { Router, Request, Response } from "express";
import authController from "@controllers/auth.controller";
import { authenticate } from "@middleware/auth.middleware";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@middleware/validation.middleware";
import {
  authLimiter,
  emailLimiter,
  passwordResetLimiter,
} from "@middleware/rate-limiter";
import nodemailerService from "@services/email/nodemailer.service";
import logger from "@utils/logger";

const router = Router();

// Public routes
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);
router.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  "/resend-verification",
  emailLimiter,
  validate(forgotPasswordSchema),
  authController.resendVerificationEmail
);

// Test email route (development only)
router.post(
  "/test-email",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }

      logger.info(`Testing email to: ${email}`);
      logger.info(
        `SMTP Config: host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT}, user=${process.env.SMTP_USER}, from=${process.env.EMAIL_FROM}`
      );

      await nodemailerService.sendVerificationEmail(
        email,
        "123456",
        "Test User"
      );

      res.status(200).json({
        success: true,
        message: `Test email sent to ${email}. Check your inbox and spam folder.`,
        config: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
          from: process.env.EMAIL_FROM,
        },
      });
    } catch (error: any) {
      logger.error(`Test email failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to send test email",
        error: error.message,
      });
    }
  }
);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
