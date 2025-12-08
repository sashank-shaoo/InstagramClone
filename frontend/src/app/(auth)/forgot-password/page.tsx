"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await authApi.forgotPassword(email);
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
          Email Sent
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}>
          We sent an email to {email} with a link to reset your password.
        </p>
        <Link
          href="/login"
          style={{
            color: "var(--accent-blue)",
            fontWeight: "600",
          }}>
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}>
      <div
        style={{
          padding: "var(--space-6)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
        }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto var(--space-4)",
              border: "2px solid var(--text-primary)",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            🔒
          </div>
          <h1
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: "600",
              marginBottom: "var(--space-2)",
            }}>
            Trouble logging in?
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}>
            Enter your email and we'll send you a link to get back into your
            account.
          </p>
        </div>

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
          <div style={{ marginBottom: "var(--space-4)" }}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={!email}>
            Send Login Link
          </Button>
        </form>

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

        <div style={{ textAlign: "center" }}>
          <Link
            href="/register"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "600",
              color: "var(--text-primary)",
            }}>
            Create New Account
          </Link>
        </div>
      </div>

      <div
        style={{
          padding: "var(--space-4)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}>
        <Link
          href="/login"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "600",
            color: "var(--text-primary)",
          }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
