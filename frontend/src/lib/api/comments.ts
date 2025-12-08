import api from "./client";
import type { ApiResponse, Comment } from "../types";

export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateCommentData {
  text: string;
  parentCommentId?: string;
}

export interface CommentLikeResponse {
  likesCount: number;
}

export const commentApi = {
  /**
   * Create a new comment on a post
   */
  createComment: async (
    postId: string,
    data: CreateCommentData
  ): Promise<ApiResponse<{ comment: Comment }>> => {
    const response = await api.post<ApiResponse<{ comment: Comment }>>(
      `/comments/${postId}`,
      data
    );
    return response.data;
  },

  /**
   * Get comments for a post
   */
  getComments: async (
    postId: string,
    page: number = 1,
    limit: number = 20,
    parentCommentId?: string
  ): Promise<ApiResponse<CommentsResponse>> => {
    const response = await api.get<ApiResponse<CommentsResponse>>(
      `/comments/${postId}`,
      {
        params: { page, limit, parentCommentId },
      }
    );
    return response.data;
  },

  /**
   * Delete a comment
   */
  deleteComment: async (commentId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/comments/${commentId}`
    );
    return response.data;
  },

  /**
   * Like a comment
   */
  likeComment: async (
    commentId: string
  ): Promise<ApiResponse<CommentLikeResponse>> => {
    const response = await api.post<ApiResponse<CommentLikeResponse>>(
      `/comments/${commentId}/like`
    );
    return response.data;
  },

  /**
   * Unlike a comment
   */
  unlikeComment: async (
    commentId: string
  ): Promise<ApiResponse<CommentLikeResponse>> => {
    const response = await api.delete<ApiResponse<CommentLikeResponse>>(
      `/comments/${commentId}/like`
    );
    return response.data;
  },
};
