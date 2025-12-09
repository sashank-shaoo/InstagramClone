"use client";

import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import type { SocketNotification, UserStatus } from "@/lib/types";

const SOCKET_URL = (() => {
  // Use explicit socket URL if set
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Derive from API URL (remove /api suffix if present)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return apiUrl.replace(/\/api\/?$/, "");
})();

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const { accessToken, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated || !accessToken) {
      console.log("Socket: Not authenticated, skipping connection");
      return;
    }

    if (this.socket?.connected) {
      // Already connected, no action needed
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket: Connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket: Disconnected -", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket: Connection error -", error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log("Socket: Max reconnection attempts reached");
        this.disconnect();
      }
    });

    // Handle notifications
    this.socket.on("notification", (notification: SocketNotification) => {
      console.log("Socket: Received notification", notification);
      // Note: The notification from socket might need transformation
      // to match our Notification type
      useNotificationStore.getState().incrementUnreadCount();
    });

    // Handle user status updates
    this.socket.on("user:status", (status: UserStatus) => {
      console.log("Socket: User status update", status);
      // Can broadcast to subscribers or update a user status store
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("Socket: Disconnected manually");
    }
  }

  // Join a post room for real-time updates
  joinPost(postId: string) {
    if (this.socket?.connected) {
      this.socket.emit("post:join", postId);
    }
  }

  // Leave a post room
  leavePost(postId: string) {
    if (this.socket?.connected) {
      this.socket.emit("post:leave", postId);
    }
  }

  // Emit typing start
  startTyping(postId: string) {
    if (this.socket?.connected) {
      this.socket.emit("typing:start", { postId });
    }
  }

  // Emit typing stop
  stopTyping(postId: string) {
    if (this.socket?.connected) {
      this.socket.emit("typing:stop", { postId });
    }
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketClient = new SocketClient();
