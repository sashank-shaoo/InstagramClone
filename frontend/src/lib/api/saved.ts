import api from "./client";
import type { ApiResponse, Post } from "../types";

export interface SavedPostsResponse {
  posts: (Post & { savedAt: string })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SavedCheckResponse {
  isSaved: boolean;
}

export const savedApi = {
  /**
   * Save a post
   */
  savePost: async (postId: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/saved/${postId}`);
    return response.data;
  },

  /**
   * Unsave a post
   */
  unsavePost: async (postId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/saved/${postId}`);
    return response.data;
  },

  /**
   * Get saved posts for the authenticated user
   */
  getSavedPosts: async (
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<SavedPostsResponse>> => {
    const response = await api.get<ApiResponse<SavedPostsResponse>>("/saved", {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Check if a post is saved
   */
  checkSaved: async (
    postId: string
  ): Promise<ApiResponse<SavedCheckResponse>> => {
    const response = await api.get<ApiResponse<SavedCheckResponse>>(
      `/saved/${postId}/check`
    );
    return response.data;
  },
};
