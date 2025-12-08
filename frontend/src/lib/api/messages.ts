import api from "./client";
import type { ApiResponse, User } from "../types";

// Message types
export interface Message {
  id: string;
  sender: User;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  isRead?: boolean;
  isMine: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: {
    text: string;
    sender: string;
    createdAt: string;
    readBy?: string[];
  };
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SendMessageData {
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export const messageApi = {
  /**
   * Get all conversations for the authenticated user
   */
  getConversations: async (
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<ConversationsResponse>> => {
    const response = await api.get<ApiResponse<ConversationsResponse>>(
      "/messages/conversations",
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Get or create a conversation with another user
   */
  getOrCreateConversation: async (
    userId: string
  ): Promise<ApiResponse<{ conversation: Conversation }>> => {
    const response = await api.post<
      ApiResponse<{ conversation: Conversation }>
    >(`/messages/conversations/${userId}`);
    return response.data;
  },

  /**
   * Get messages in a conversation
   */
  getMessages: async (
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ApiResponse<MessagesResponse>> => {
    const response = await api.get<ApiResponse<MessagesResponse>>(
      `/messages/${conversationId}`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Send a message in a conversation
   */
  sendMessage: async (
    conversationId: string,
    data: SendMessageData
  ): Promise<ApiResponse<{ message: Message }>> => {
    const response = await api.post<ApiResponse<{ message: Message }>>(
      `/messages/${conversationId}`,
      data
    );
    return response.data;
  },

  /**
   * Mark messages as read in a conversation
   */
  markAsRead: async (conversationId: string): Promise<ApiResponse<void>> => {
    const response = await api.put<ApiResponse<void>>(
      `/messages/${conversationId}/read`
    );
    return response.data;
  },
};
