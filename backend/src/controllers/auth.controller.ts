import { Request, Response } from "express";
import User from "@models/User.model";
import jwtService, { TokenPayload } from "@services/auth/jwt.service";
import otpService from "@services/auth/otp.service";
import emailService from "@services/email/brevo.service";
import {
  asyncHandler,
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";

class AuthController {
  /**
   * Register new user
   */
  register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username, email, password, fullName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictError("Email already registered");
        }
        if (existingUser.username === username) {
          throw new ConflictError("Username already taken");
        }
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password,
        fullName,
        isEmailVerified: false,
      });

      // Generate OTP
      const otp = await otpService.createOTP(email, "email_verification");

      // Send verification email
      await emailService.sendVerificationEmail(email, otp, fullName);

      logger.info(`User registered: ${username} (${email})`);

      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email for verification code.",
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    }
  );

  /**
   * Verify email with OTP
   */
  verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, otp } = req.body;

      // Verify OTP
      const isValid = await otpService.verifyOTP(
        email,
        otp,
        "email_verification"
      );

      if (!isValid) {
        throw new ValidationError("Invalid or expired OTP");
      }

      // Update user's email verification status
      const user = await User.findOneAndUpdate(
        { email },
        { isEmailVerified: true },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Send welcome email
      await emailService.sendWelcomeEmail(
        user.email,
        user.fullName,
        user.username
      );

      // Generate tokens
      const tokenPayload: TokenPayload = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
      };

      const accessToken = jwtService.generateAccessToken(tokenPayload);
      const refreshToken = jwtService.generateRefreshToken(tokenPayload);

      // Store refresh token hash
      const refreshTokenHash = jwtService.hashToken(refreshToken);
      user.refreshTokenHash = refreshTokenHash;
      user.refreshTokenExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days
      await user.save();

      logger.info(`Email verified: ${email}`);

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            profilePhoto: user.profilePhoto,
            bio: user.bio,
            isEmailVerified: user.isEmailVerified,
          },
          accessToken,
          refreshToken,
        },
      });
    }
  );

  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password");

    if (!user) {
      throw new AuthError("Invalid credentials");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AuthError("Invalid credentials");
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AuthError("Account has been deactivated");
    }

    // Check if email is verified - if not, resend verification email
    if (!user.isEmailVerified) {
      try {
        // Generate new OTP
        const otp = await otpService.createOTP(
          user.email,
          "email_verification"
        );
        // Send verification email
        await emailService.sendVerificationEmail(
          user.email,
          otp,
          user.fullName
        );
        logger.info(
          `Verification email resent on login attempt to: ${user.email}`
        );
      } catch (emailError) {
        logger.error(`Failed to send verification email: ${emailError}`);
      }

      res.status(403).json({
        success: false,
        message:
          "Email not verified. A new verification code has been sent to your email.",
        data: {
          isEmailVerified: false,
          email: user.email,
        },
      });
      return;
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const refreshTokenHash = jwtService.hashToken(refreshToken);
    user.refreshTokenHash = refreshTokenHash;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    logger.info(`User logged in: ${user.username}`);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          profilePhoto: user.profilePhoto,
          bio: user.bio,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  /**
   * Logout user
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // Clear refresh token
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 },
    });

    logger.info(`User logged out: ${req.user!.username}`);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  });

  /**
   * Refresh access token
   */
  refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AuthError("Refresh token is required");
      }

      // Verify refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);

      // Find user and check stored refresh token
      const user = await User.findById(decoded.id).select(
        "+refreshTokenHash +refreshTokenExpiresAt"
      );

      if (!user) {
        throw new AuthError("User not found");
      }

      // Verify stored refresh token matches
      const refreshTokenHash = jwtService.hashToken(refreshToken);
      if (user.refreshTokenHash !== refreshTokenHash) {
        throw new AuthError("Invalid refresh token");
      }

      // Check expiration
      if (
        user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt < new Date()
      ) {
        throw new AuthError("Refresh token expired");
      }

      // Generate new access token
      const tokenPayload: TokenPayload = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
      };

      const newAccessToken = jwtService.generateAccessToken(tokenPayload);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
        },
      });
    }
  );

  /**
   * Forgot password - Send OTP
   */
  forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;

      // Find user
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists
        res.status(200).json({
          success: true,
          message: "If the email exists, a password reset code has been sent.",
        });
        return;
      }

      // Generate OTP
      const otp = await otpService.createOTP(email, "password_reset");

      // Send password reset email
      await emailService.sendPasswordResetEmail(email, otp, user.fullName);

      logger.info(`Password reset OTP sent to: ${email}`);

      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset code has been sent.",
      });
    }
  );

  /**
   * Reset password with OTP
   */
  resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, otp, newPassword } = req.body;

      // Verify OTP
      const isValid = await otpService.verifyOTP(email, otp, "password_reset");

      if (!isValid) {
        throw new ValidationError("Invalid or expired OTP");
      }

      // Find user and update password
      const user = await User.findOne({ email });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens (logout from all devices)
      user.refreshTokenHash = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();

      logger.info(`Password reset successful for: ${email}`);

      res.status(200).json({
        success: true,
        message:
          "Password reset successful. Please login with your new password.",
      });
    }
  );

  /**
   * Change password (authenticated)
   */
  changePassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Find user with password
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        throw new AuthError("Current password is incorrect");
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    }
  );

  /**
   * Resend verification email
   */
  resendVerificationEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (user.isEmailVerified) {
        throw new ValidationError("Email is already verified");
      }

      // Generate new OTP
      const otp = await otpService.createOTP(email, "email_verification");

      // Send verification email
      await emailService.sendVerificationEmail(email, otp, user.fullName);

      logger.info(`Verification email resent to: ${email}`);

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    }
  );
}

export default new AuthController();
