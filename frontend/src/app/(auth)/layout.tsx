"use client";

import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "var(--bg-primary)",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: "350px",
        }}>
        {children}
      </div>
    </div>
  );
}
