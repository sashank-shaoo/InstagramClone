import logger from "@utils/logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Brevo Email Service using HTTP API
 * Uses HTTPS (port 443) instead of SMTP (port 587) which is blocked on Railway
 */
class BrevoEmailService {
  private apiKey: string;
  private apiUrl = "https://api.brevo.com/v3/smtp/email";
  private fromEmail: string;
  private fromName: string;
  private useSmtpFallback: boolean;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD || "";
    this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "";
    this.fromName = process.env.EMAIL_FROM_NAME || "Instagram Clone";
    this.useSmtpFallback = false;

    if (!this.apiKey) {
      logger.warn("BREVO_API_KEY not set, email service will not work");
    } else {
      logger.info("Brevo HTTP API email service initialized");
    }
  }

  /**
   * Send email using Brevo HTTP API
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.apiKey) {
      logger.error("Cannot send email: BREVO_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const payload = {
      sender: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text || "",
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      logger.info(`Email sent successfully to ${options.to} via Brevo API`);
    } catch (error: any) {
      logger.error(`Brevo API email error: ${error.message}`);
      throw error;
    }
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
              <a href="${process.env.CLIENT_URL || "http://localhost:3000"}" class="button">Go to App</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Instagram Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Hi ${name},\n\nWelcome to Instagram Clone! Your account @${username} has been successfully created.\n\nVisit ${process.env.CLIENT_URL || "http://localhost:3000"} to get started!`;

    await this.sendEmail({
      to: email,
      subject: "Welcome to Instagram Clone!",
      html,
      text,
    });
  }
}

export default new BrevoEmailService();
