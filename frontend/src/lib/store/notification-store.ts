import { create } from "zustand";
import type { Notification } from "@/lib/types";
import { notificationApi } from "@/lib/api/notifications";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  markAsRead: async (id) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  },

  removeNotification: async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  fetchNotifications: async (reset = false) => {
    const { isLoading, page, hasMore } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({ isLoading: true });
    try {
      const currentPage = reset ? 1 : page;
      const response = await notificationApi.getNotifications(currentPage, 20);
      const { notifications: newNotifications, pagination } = response.data!;

      set((state) => ({
        notifications: reset
          ? newNotifications
          : [...state.notifications, ...newNotifications],
        page: currentPage + 1,
        hasMore: currentPage < pagination.pages,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.data?.unreadCount || 0 });
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },
}));
