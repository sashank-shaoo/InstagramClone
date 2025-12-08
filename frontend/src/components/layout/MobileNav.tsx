"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  PlusSquare,
  MessageCircle,
  User,
  Film,
  Bell,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { messageApi, notificationApi } from "@/lib/api";
import { io, Socket } from "socket.io-client";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/reels", icon: Film, label: "Reels" },
  { href: "/create", icon: PlusSquare, label: "Create" },
];

// Badge component
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      style={{
        position: "absolute",
        top: "-4px",
        right: "-4px",
        minWidth: "18px",
        height: "18px",
        padding: "0 5px",
        background: "#ff3040",
        borderRadius: "9px",
        color: "white",
        fontSize: "11px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid var(--bg-primary)",
      }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch unread counts
  const fetchCounts = useCallback(async () => {
    if (!user || !accessToken) return;

    try {
      // Fetch unread message count
      const convResponse = await messageApi.getConversations(1, 100);
      const totalUnread =
        convResponse.data?.conversations?.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0
        ) || 0;
      setUnreadMessages(totalUnread);

      // Fetch unread notification count
      const notifResponse = await notificationApi.getUnreadCount();
      setUnreadNotifications(notifResponse.data?.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notification counts:", error);
    }
  }, [user, accessToken]);

  // Initial fetch and polling
  useEffect(() => {
    fetchCounts();

    // Poll every 60 seconds (reduced from 30 to avoid rate limiting)
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        auth: { token: accessToken },
        transports: ["websocket"],
      }
    );

    socket.on("new_message", () => {
      // Increment unread messages
      if (!pathname.startsWith("/messages")) {
        setUnreadMessages((prev) => prev + 1);
      }
    });

    socket.on("new_notification", () => {
      // Increment unread notifications
      setUnreadNotifications((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, pathname]);

  // Reset counts when visiting respective pages
  useEffect(() => {
    if (pathname.startsWith("/messages")) {
      setUnreadMessages(0);
    }
  }, [pathname]);

  return (
    <>
      <nav
        className="fixed glass safe-area-bottom"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: "var(--nav-height-mobile)",
          borderTop: "1px solid var(--border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingLeft: "var(--space-2)",
          paddingRight: "var(--space-2)",
          zIndex: "var(--z-fixed)",
        }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--space-2)",
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                transition: "transform var(--transition-fast)",
              }}>
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  transition: "color var(--transition-fast)",
                }}
              />
            </Link>
          );
        })}

        {/* Messages Link with Badge */}
        <Link
          href="/messages"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-2)",
            position: "relative",
            WebkitTapHighlightColor: "transparent",
          }}>
          <MessageCircle
            size={24}
            strokeWidth={pathname.startsWith("/messages") ? 2.5 : 1.5}
            style={{
              color: pathname.startsWith("/messages")
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            }}
          />
          <Badge count={unreadMessages} />
        </Link>

        {/* Profile Link */}
        <Link
          href={user ? `/profile/${user.username}` : "/login"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-2)",
            position: "relative",
            WebkitTapHighlightColor: "transparent",
          }}>
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.fullName || "Profile"}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "var(--radius-full)",
                objectFit: "cover",
                border: pathname.startsWith("/profile")
                  ? "2px solid var(--text-primary)"
                  : "1px solid var(--border-color)",
              }}
            />
          ) : (
            <User
              size={24}
              strokeWidth={pathname.startsWith("/profile") ? 2.5 : 1.5}
              style={{
                color: pathname.startsWith("/profile")
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              }}
            />
          )}
          {/* Notification badge on profile */}
          {unreadNotifications > 0 && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "8px",
                height: "8px",
                background: "#ff3040",
                borderRadius: "50%",
                border: "2px solid var(--bg-primary)",
              }}
            />
          )}
        </Link>
      </nav>

      {/* Hide on tablet landscape and desktop */}
      <style jsx>{`
        @media (min-width: 768px) {
          nav {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
