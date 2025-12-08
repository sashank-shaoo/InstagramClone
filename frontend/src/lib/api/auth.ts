import api, { getErrorMessage } from "./client";
import type {
  User,
  LoginCredentials,
  RegisterData,
  VerifyEmailData,
  ApiResponse,
} from "@/lib/types";

interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<ApiResponse<{ user: User }>> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  /**
   * Verify email with OTP
   */
  async verifyEmail(data: VerifyEmailData): Promise<ApiResponse<AuthData>> {
    const response = await api.post("/auth/verify-email", data);
    return response.data;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthData>> {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthData>> {
    const response = await api.post("/auth/refresh-token", { refreshToken });
    return response.data;
  },

  /**
   * Forgot password - request reset
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<ApiResponse> {
    const response = await api.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse> {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    const response = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export { getErrorMessage };
