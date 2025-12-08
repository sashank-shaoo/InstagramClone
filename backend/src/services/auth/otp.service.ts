import crypto from 'crypto';
import OTP, { OTPType } from '@models/OTP.model';
import logger from '@utils/logger';

class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
  private readonly MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and store OTP
   */
  async createOTP(email: string, type: OTPType): Promise<string> {
    try {
      // Delete any existing OTPs for this email and type
      await OTP.deleteMany({ email, type, isUsed: false });

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Create OTP document (password will be hashed in pre-save hook)
      const otpDoc = new OTP({
        email,
        otpHash: otp, // Will be hashed automatically
        type,
        expiresAt,
        isUsed: false,
        attempts: 0,
      });

      await otpDoc.save();

      logger.info(`OTP created for ${email} (${type})`);
      
      return otp; // Return plain OTP to send via email
    } catch (error) {
      logger.error(`Error creating OTP: ${error}`);
      throw new Error('Failed to create OTP');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string, type: OTPType): Promise<boolean> {
    try {
      // Find the most recent unused OTP
      const otpDoc = await OTP.findOne({
        email,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
        .select('+otpHash')
        .sort({ createdAt: -1 });

      if (!otpDoc) {
        logger.warn(`No valid OTP found for ${email} (${type})`);
        return false;
      }

      // Check if max attempts exceeded
      if (otpDoc.attempts >= this.MAX_ATTEMPTS) {
        logger.warn(`Max OTP attempts exceeded for ${email} (${type})`);
        await otpDoc.deleteOne();
        throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
      }

      // Increment attempts
      otpDoc.attempts += 1;
      await otpDoc.save();

      // Verify OTP
      const isValid = await otpDoc.compareOTP(otp);

      if (isValid) {
        // Mark as used
        otpDoc.isUsed = true;
        await otpDoc.save();
        logger.info(`OTP verified successfully for ${email} (${type})`);
        return true;
      }

      logger.warn(`Invalid OTP provided for ${email} (${type})`);
      return false;
    } catch (error: any) {
      logger.error(`Error verifying OTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if OTP exists and is valid
   */
  async hasValidOTP(email: string, type: OTPType): Promise<boolean> {
    const otpDoc = await OTP.findOne({
      email,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    return !!otpDoc;
  }

  /**
   * Delete all OTPs for an email
   */
  async deleteOTPs(email: string, type?: OTPType): Promise<void> {
    const query: any = { email };
    if (type) {
      query.type = type;
    }
    await OTP.deleteMany(query);
    logger.info(`Deleted OTPs for ${email}${type ? ` (${type})` : ''}`);
  }
}

export default new OTPService();
