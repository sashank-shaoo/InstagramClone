import api from "./client";
import type { User, ApiResponse, PaginatedResponse } from "@/lib/types";

interface ProfileUpdate {
  fullName?: string;
  bio?: string;
  username?: string;
}

export const userApi = {
  /**
   * Get user profile by username
   */
  async getProfile(username: string): Promise<ApiResponse<{ user: User }>> {
    const response = await api.get(`/users/${username}`);
    return response.data;
  },

  /**
   * Update current user's profile
   */
  async updateProfile(
    data: ProfileUpdate
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await api.put("/users/profile", data);
    return response.data;
  },

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(
    file: File
  ): Promise<ApiResponse<{ profilePhoto: string }>> {
    const formData = new FormData();
    formData.append("photo", file);

    const response = await api.post("/users/profile/photo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(): Promise<ApiResponse> {
    const response = await api.delete("/users/profile/photo");
    return response.data;
  },

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<User>> {
    const response = await api.get("/users/search", {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  /**
   * Get user suggestions
   */
  async getSuggestions(): Promise<ApiResponse<{ suggestions: User[] }>> {
    const response = await api.get("/users/suggestions/users");
    return response.data;
  },

  /**
   * Follow a user
   */
  async followUser(username: string): Promise<ApiResponse> {
    const response = await api.post(`/users/${username}/follow`);
    return response.data;
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(username: string): Promise<ApiResponse> {
    const response = await api.delete(`/users/${username}/follow`);
    return response.data;
  },

  /**
   * Get following users with online status
   */
  async getFollowingWithStatus(): Promise<
    ApiResponse<{
      users: Array<{
        id: string;
        username: string;
        fullName: string;
        profilePhoto?: string;
        isOnline: boolean;
      }>;
    }>
  > {
    const response = await api.get("/users/following/status");
    return response.data;
  },
};
