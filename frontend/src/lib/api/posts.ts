import api from "./client";
import type { ApiResponse, PaginatedResponse, Post } from "../types";

export interface CreatePostData {
  media: File;
  caption?: string;
  location?: string;
}

export interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LikeResponse {
  likesCount: number;
}

export const postApi = {
  /**
   * Create a post with image
   */
  createImagePost: async (
    data: CreatePostData
  ): Promise<ApiResponse<{ post: Post }>> => {
    const formData = new FormData();
    formData.append("media", data.media);
    if (data.caption) formData.append("caption", data.caption);
    if (data.location) formData.append("location", data.location);

    const response = await api.post<ApiResponse<{ post: Post }>>(
      "/posts/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Create a post with video
   */
  createVideoPost: async (
    data: CreatePostData
  ): Promise<ApiResponse<{ post: Post }>> => {
    const formData = new FormData();
    formData.append("media", data.media);
    if (data.caption) formData.append("caption", data.caption);
    if (data.location) formData.append("location", data.location);

    const response = await api.post<ApiResponse<{ post: Post }>>(
      "/posts/video",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Get home feed
   */
  getFeed: async (
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PostsResponse>> => {
    const response = await api.get<ApiResponse<PostsResponse>>("/posts/feed", {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get explore page - all image posts from all users
   */
  getExplore: async (
    page: number = 1,
    limit: number = 30
  ): Promise<ApiResponse<PostsResponse>> => {
    const response = await api.get<ApiResponse<PostsResponse>>(
      "/posts/explore",
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Get single post
   */
  getPost: async (postId: string): Promise<ApiResponse<{ post: Post }>> => {
    const response = await api.get<ApiResponse<{ post: Post }>>(
      `/posts/${postId}`
    );
    return response.data;
  },

  /**
   * Get posts by username
   */
  getUserPosts: async (
    username: string,
    page: number = 1,
    limit: number = 12
  ): Promise<ApiResponse<PostsResponse>> => {
    const response = await api.get<ApiResponse<PostsResponse>>(
      `/posts/user/${username}`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Update post
   */
  updatePost: async (
    postId: string,
    data: { caption?: string; location?: string }
  ): Promise<ApiResponse<{ post: Post }>> => {
    const response = await api.put<ApiResponse<{ post: Post }>>(
      `/posts/${postId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete post
   */
  deletePost: async (postId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/posts/${postId}`);
    return response.data;
  },

  /**
   * Like a post
   */
  likePost: async (postId: string): Promise<ApiResponse<LikeResponse>> => {
    const response = await api.post<ApiResponse<LikeResponse>>(
      `/posts/${postId}/like`
    );
    return response.data;
  },

  /**
   * Unlike a post
   */
  unlikePost: async (postId: string): Promise<ApiResponse<LikeResponse>> => {
    const response = await api.delete<ApiResponse<LikeResponse>>(
      `/posts/${postId}/like`
    );
    return response.data;
  },
};
