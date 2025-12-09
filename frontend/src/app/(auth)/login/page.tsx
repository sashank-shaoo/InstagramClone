"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { authApi, getErrorMessage } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, hasHydrated } = useAuthStore();

  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await authApi.login(formData);
      const { user, accessToken, refreshToken } = response.data!;
      login(accessToken, refreshToken, user);
      socketClient.connect();
      router.push("/explore");
    } catch (err: unknown) {
      // Check if it's an axios error with 403 status (unverified email)
      const axiosError = err as {
        response?: {
          status?: number;
          data?: { message?: string; data?: { email?: string } };
        };
      };
      if (axiosError?.response?.status === 403) {
        const email = axiosError.response?.data?.data?.email;
        setInfo(
          axiosError.response?.data?.message ||
            "Email not verified. Check your email for verification code."
        );
        // Store email for verification page
        if (email) {
          sessionStorage.setItem("verifyEmail", email);
          // Redirect to verify page after a short delay
          setTimeout(() => {
            router.push("/verify-email");
          }, 2000);
        }
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect authenticated users (only after hydration is complete)
  React.useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push("/explore");
    }
  }, [hasHydrated, isAuthenticated, router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}>
      {/* Logo */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "var(--space-4)",
        }}>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "500",
            fontStyle: "italic",
          }}>
          Instagram
        </h1>
      </div>

      {/* Login Card */}
      <div
        style={{
          padding: "var(--space-6)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
        }}>
        {/* Error Message */}
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

        {/* Info Message (for email verification) */}
        {info && (
          <div
            style={{
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
              background: "rgba(0, 149, 246, 0.1)",
              border: "1px solid var(--accent-blue)",
              borderRadius: "var(--radius-sm)",
              color: "var(--accent-blue)",
              fontSize: "var(--text-sm)",
              textAlign: "center",
            }}>
            {info}
            <p
              style={{
                marginTop: "var(--space-2)",
                fontSize: "var(--text-xs)",
              }}>
              Redirecting to verification page...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "var(--space-3)" }}>
            <Input
              name="emailOrUsername"
              type="text"
              placeholder="Phone number, username, or email"
              value={formData.emailOrUsername}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={!formData.emailOrUsername || !formData.password}>
            Log in
          </Button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            margin: "var(--space-5) 0",
          }}>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color)",
            }}
          />
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "600",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
            }}>
            Or
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color)",
            }}
          />
        </div>

        {/* Forgot Password */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/forgot-password"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-link)",
            }}>
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Sign Up Card */}
      <div
        style={{
          padding: "var(--space-5)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}>
        <p style={{ fontSize: "var(--text-sm)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--accent-blue)",
              fontWeight: "600",
            }}>
            Sign up
          </Link>
        </p>
      </div>

      {/* App Download (optional on mobile) */}
      <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
            marginBottom: "var(--space-3)",
          }}>
          Get the app.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-2)",
          }}>
          {/* App store badges would go here */}
        </div>
      </div>
    </div>
  );
}
