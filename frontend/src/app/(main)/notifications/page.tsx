"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useNotificationStore } from "@/lib/store/notification-store";
import { formatRelativeTime } from "@/lib/utils";
import { Heart, MessageCircle, UserPlus, AtSign } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/types";

const mockNotifications: Notification[] = [
  {
    id: "n1",
    recipient: "me",
    sender: {
      id: "u1",
      username: "naturelover",
      email: "",
      fullName: "Nature Explorer",
      profilePhoto: "https://picsum.photos/seed/10/100",
      isEmailVerified: true,
    },
    type: "like",
    message: "liked your photo.",
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    recipient: "me",
    sender: {
      id: "u2",
      username: "foodie_adventures",
      email: "",
      fullName: "Food Explorer",
      profilePhoto: "https://picsum.photos/seed/11/100",
      isEmailVerified: true,
    },
    type: "follow",
    message: "started following you.",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    recipient: "me",
    sender: {
      id: "u3",
      username: "urban_photographer",
      email: "",
      fullName: "City Shots",
      profilePhoto: "https://picsum.photos/seed/12/100",
      isEmailVerified: true,
    },
    type: "comment",
    message: 'commented: "Amazing shot!" 📸',
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "like":
      return (
        <Heart size={12} fill="var(--accent-red)" color="var(--accent-red)" />
      );
    case "comment":
      return <MessageCircle size={12} color="var(--accent-blue)" />;
    case "follow":
      return <UserPlus size={12} color="var(--accent-purple)" />;
    case "mention":
      return <AtSign size={12} color="var(--accent-orange)" />;
    default:
      return null;
  }
};

export default function NotificationsPage() {
  const { markAllAsRead, markAsRead } = useNotificationStore();
  const [notifications, setNotifications] = useState(mockNotifications);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    markAllAsRead();
  };

  const handleMarkRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    markAsRead(id);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-4) 0",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "var(--space-2)",
        }}>
        <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "600" }}>
          Activity
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div>
        {notifications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-10)",
              color: "var(--text-secondary)",
            }}>
            <p>No activity yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() =>
                !notification.isRead && handleMarkRead(notification.id)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-2)",
                background: notification.isRead
                  ? "transparent"
                  : "rgba(0, 149, 246, 0.05)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
              }}>
              <Link href={`/profile/${notification.sender.username}`}>
                <Avatar
                  src={notification.sender.profilePhoto}
                  name={notification.sender.fullName}
                  size="md"
                />
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.4 }}>
                  <Link
                    href={`/profile/${notification.sender.username}`}
                    style={{ fontWeight: "600" }}>
                    {notification.sender.username}
                  </Link>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>
                    {notification.message}
                  </span>
                </p>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                    marginTop: "2px",
                  }}>
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                {getNotificationIcon(notification.type)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
