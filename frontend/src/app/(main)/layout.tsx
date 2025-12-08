"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  // Redirect to login if not authenticated (only after hydration)
  React.useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Show loading while hydrating from localStorage
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            border: "2px solid var(--border-color)",
            borderTopColor: "var(--accent-blue)",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  // Don't render content until we verify auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Sidebar: Hidden on mobile, icons on tablet, full on desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        className="transition"
        style={{
          paddingBottom:
            "calc(var(--nav-height-mobile) + var(--safe-area-bottom))",
          minHeight: "100dvh",
        }}>
        {/* 
          Mobile: Full width, no left margin
          Tablet (768px+): Left margin for compact sidebar
          Desktop (1024px+): Left margin for full sidebar
        */}
        <div
          style={{
            marginLeft: 0,
            transition: "margin var(--transition-base)",
          }}
          className="md-sidebar-margin">
          <div
            style={{
              maxWidth: "var(--max-page-width)",
              margin: "0 auto",
              padding: "var(--space-4)",
            }}>
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Navigation: Visible on mobile and tablet portrait */}
      <MobileNav />

      {/* Responsive margin styles */}
      <style jsx>{`
        @media (min-width: 768px) {
          .md-sidebar-margin {
            margin-left: var(--sidebar-width-compact) !important;
          }
          main {
            padding-bottom: 0 !important;
          }
        }
        @media (min-width: 1024px) {
          .md-sidebar-margin {
            margin-left: var(--sidebar-width-full) !important;
          }
        }
      `}</style>
    </div>
  );
}
