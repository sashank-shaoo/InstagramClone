"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Film,
  MessageCircle,
  PlusSquare,
  Menu,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/reels", icon: Film, label: "Reels" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/create", icon: PlusSquare, label: "Create" },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <>
      <aside
        className={`sidebar ${className || ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100dvh",
          backgroundColor: "var(--bg-primary)",
          borderRight: "1px solid var(--border-light)",
          display: "none", // Hidden on mobile by default
          flexDirection: "column",
          zIndex: "var(--z-sticky)",
          transition: "width var(--transition-base)",
          overflowX: "hidden",
        }}>
        {/* Logo */}
        <div
          style={{
            padding: "var(--space-5) var(--space-3)",
            marginBottom: "var(--space-2)",
          }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}>
            {/* Icon logo - always visible */}
            <div
              style={{
                width: "28px",
                height: "28px",
                flexShrink: 0,
              }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="18" cy="6" r="1.5" fill="currentColor" />
              </svg>
            </div>

            {/* Text logo - only on desktop */}
            <span
              className="logo-text"
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: "500",
                fontStyle: "italic",
                display: "none", // Hidden by default, shown on lg
              }}>
              Instagram
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "0 var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="nav-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-lg)",
                  transition: "background var(--transition-fast)",
                  position: "relative",
                }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    style={{
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <span
                  className="nav-label"
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: isActive ? "600" : "400",
                    display: "none", // Hidden by default, shown on lg
                  }}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Profile */}
          <Link
            href={user ? `/profile/${user.username}` : "/login"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-lg)",
              transition: "background var(--transition-fast)",
            }}
            className="nav-item">
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
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-color)",
                  flexShrink: 0,
                }}>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                  }}>
                  {user?.fullName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <span
              className="nav-label"
              style={{
                fontSize: "var(--text-base)",
                fontWeight: pathname.startsWith("/profile") ? "600" : "400",
                display: "none",
              }}>
              Profile
            </span>
          </Link>
        </nav>

        {/* Bottom Section */}
        <div
          style={{
            padding: "var(--space-3)",
            borderTop: "1px solid var(--border-light)",
          }}>
          <button
            className="nav-item"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-lg)",
              transition: "background var(--transition-fast)",
            }}>
            <Menu
              size={24}
              style={{ color: "var(--text-primary)", flexShrink: 0 }}
            />
            <span
              className="nav-label"
              style={{
                fontSize: "var(--text-base)",
                display: "none",
              }}>
              More
            </span>
          </button>
        </div>
      </aside>

      {/* Responsive styles */}
      <style jsx>{`
        /* Hidden on mobile */
        .sidebar {
          display: none !important;
        }

        /* Tablet: Show compact sidebar (icons only) */
        @media (min-width: 768px) {
          .sidebar {
            display: flex !important;
            width: var(--sidebar-width-compact);
          }

          .nav-item:hover {
            background: var(--bg-secondary);
          }

          .desktop-only {
            display: none !important;
          }
        }

        /* Desktop: Show full sidebar with labels */
        @media (min-width: 1024px) {
          .sidebar {
            width: var(--sidebar-width-full);
          }

          .logo-text,
          .nav-label {
            display: block !important;
          }

          .desktop-only {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
