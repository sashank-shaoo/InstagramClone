"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { authApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (formData.fullName.length < 2) {
      newErrors.fullName = "Name must be at least 2 characters.";
    }

    if (!formData.username.match(/^[a-z0-9._]{3,30}$/)) {
      newErrors.username =
        "Username can only have letters, numbers, periods, and underscores.";
    }

    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "username" ? value.toLowerCase() : value,
    });
    setErrors({ ...errors, [name]: "" });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      await authApi.register(formData);
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.email &&
    formData.fullName &&
    formData.username &&
    formData.password;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}>
      {/* Register Card */}
      <div
        style={{
          padding: "var(--space-6)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
        }}>
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "var(--space-3)",
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

        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "var(--text-lg)",
            fontWeight: "600",
            marginBottom: "var(--space-4)",
          }}>
          Sign up to see photos and videos from your friends.
        </p>

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "var(--space-3)" }}>
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <Input
              name="fullName"
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
              required
              autoComplete="name"
            />
          </div>

          <div style={{ marginBottom: "var(--space-3)" }}>
            <Input
              name="username"
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
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
              error={errors.password}
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={!isFormValid}>
            Sign up
          </Button>
        </form>

        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            textAlign: "center",
            marginTop: "var(--space-4)",
            lineHeight: 1.5,
          }}>
          By signing up, you agree to our Terms, Privacy Policy and Cookies
          Policy.
        </p>
      </div>

      {/* Log In Card */}
      <div
        style={{
          padding: "var(--space-5)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}>
        <p style={{ fontSize: "var(--text-sm)" }}>
          Have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--accent-blue)",
              fontWeight: "600",
            }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
