import api from "./client";
import type { Notification, ApiResponse } from "@/lib/types";

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const notificationApi = {
  /**
   * Get user notifications
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<NotificationsResponse>> {
    const response = await api.get("/notifications", {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse> {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse> {
    const response = await api.put("/notifications/read-all");
    return response.data;
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};
