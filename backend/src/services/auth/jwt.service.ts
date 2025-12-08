import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

export interface TokenPayload {
  id: string;
  email: string;
  username: string;
  isEmailVerified: boolean;
}

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "your-access-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

class JWTService {
  /**
   * Generate access token
   */
  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: JWT_ACCESS_EXPIRY as any,
    };
    return jwt.sign(payload, JWT_ACCESS_SECRET, options);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: JWT_REFRESH_EXPIRY as any,
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, options);
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Decode token without verification (use for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Generate random token (for password reset, email change, etc.)
   */
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash token for storage
   */
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export default new JWTService();
