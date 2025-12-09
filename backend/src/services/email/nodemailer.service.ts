import nodemailer, { Transporter } from "nodemailer";
import logger from "@utils/logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class NodemailerService {
  private transporter: Transporter;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    const port = parseInt(process.env.SMTP_PORT || "587");
    // Port 465 uses SSL (secure: true), Port 587 uses STARTTLS (secure: false)
    const isSecure = port === 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: port,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info("SMTP connection verified successfully");
    } catch (error: any) {
      logger.error(`SMTP connection error: ${error.message}`);
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(options: EmailOptions, attempt: number = 1): Promise<void> {
    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || "Instagram Clone"} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`);
    } catch (error: any) {
      logger.error(`Email send error (attempt ${attempt}): ${error.message}`);

      // Retry logic
      if (attempt < this.retryAttempts) {
        logger.info(
          `Retrying email send (attempt ${attempt + 1}/${this.retryAttempts})...`
        );
        await this.delay(this.retryDelay * attempt); // Exponential backoff
        return this.sendEmail(options, attempt + 1);
      }

      throw new Error(
        `Failed to send email after ${this.retryAttempts} attempts`
      );
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    otp: string,
    name: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <div class="otp-box">
              <p>Your verification code is:</p>
              <div class="otp">${otp}</div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Instagram Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${name},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    await this.sendEmail({
      to: email,
      subject: "Verify Your Email Address",
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    otp: string,
    name: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #f5576c; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #f5576c; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Use the code below to reset it:</p>
            <div class="otp-box">
              <p>Your reset code is:</p>
              <div class="otp">${otp}</div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p><strong>If you didn't request this, please ignore this email and your password will remain unchanged.</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Instagram Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${name},\n\nYour password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    await this.sendEmail({
      to: email,
      subject: "Reset Your Password",
      html,
      text,
    });
  }

  /**
   * Send email change verification
   */
  async sendEmailChangeVerification(
    newEmail: string,
    otp: string,
    name: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #4facfe; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #4facfe; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Change Verification</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to change your email address to this one. Please verify this new email address:</p>
            <div class="otp-box">
              <p>Your verification code is:</p>
              <div class="otp">${otp}</div>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p><strong>If you didn't request this change, please secure your account immediately.</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Instagram Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${name},\n\nYour email change verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please secure your account.`;

    await this.sendEmail({
      to: newEmail,
      subject: "Verify Your New Email Address",
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    username: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Instagram Clone! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Welcome aboard! Your account <strong>@${username}</strong> has been successfully created and verified.</p>
            <p>You can now:</p>
            <ul>
              <li>Share photos and videos</li>
              <li>Follow other users</li>
              <li>Like and comment on posts</li>
              <li>Get real-time notifications</li>
            </ul>
            <p>Get started by completing your profile and posting your first photo!</p>
            <center>
              <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" class="button">Go to App</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Instagram Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${name},\n\nWelcome to Instagram Clone! Your account @${username} has been successfully created.\n\nVisit ${process.env.FRONTEND_URL || "http://localhost:3000"} to get started!`;

    await this.sendEmail({
      to: email,
      subject: "Welcome to Instagram Clone!",
      html,
      text,
    });
  }
}

export default new NodemailerService();
