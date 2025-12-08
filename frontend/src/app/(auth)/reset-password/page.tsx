"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckCircle, XCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Token param contains the OTP, also need email from URL
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get("email") || "";
      await authApi.resetPassword(email, token!, formData.password);
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        style={{
          padding: "var(--space-6)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}>
        <CheckCircle
          size={48}
          style={{
            color: "var(--accent-green)",
            margin: "0 auto var(--space-4)",
          }}
        />
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "600",
            marginBottom: "var(--space-2)",
          }}>
          Password Reset
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}>
          Your password has been reset successfully.
        </p>
        <Link href="/login">
          <Button fullWidth>Log In</Button>
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        style={{
          padding: "var(--space-6)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}>
        <XCircle
          size={48}
          style={{
            color: "var(--accent-red)",
            margin: "0 auto var(--space-4)",
          }}
        />
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "600",
            marginBottom: "var(--space-2)",
          }}>
          Invalid Link
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}>
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password">
          <Button fullWidth variant="secondary">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "var(--space-6)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-primary)",
      }}>
      <h1
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: "600",
          marginBottom: "var(--space-2)",
          textAlign: "center",
        }}>
        Create New Password
      </h1>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          marginBottom: "var(--space-4)",
          textAlign: "center",
        }}>
        Your new password must be different from previous passwords.
      </p>

      {error && (
        <div
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            background: "rgba(237, 73, 86, 0.1)",
            border: "1px solid var(--accent-red)",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-red)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
          }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "var(--space-3)" }}>
          <Input
            name="password"
            type="password"
            placeholder="New Password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Input
            name="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" fullWidth isLoading={isLoading}>
          Reset Password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "var(--space-10)" }}>
          Loading...
        </div>
      }>
      <ResetPasswordContent />
    </Suspense>
  );
}
