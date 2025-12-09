"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CheckCircle, Mail } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If no email, redirect to login
    if (!email) {
      router.push("/login");
    }
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await authApi.verifyEmail({ email, otp: otpString });
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      setResendCooldown(60);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
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
          Email Verified!
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
          }}>
          Your email has been verified. You can now log in.
        </p>
        <Link href="/login">
          <Button fullWidth>Log In</Button>
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
      <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
        <Mail
          size={48}
          style={{
            color: "var(--accent-blue)",
            margin: "0 auto var(--space-4)",
          }}
        />
        <h1
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "600",
            marginBottom: "var(--space-2)",
          }}>
          Verify Your Email
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}>
          We sent a code to <strong>{email}</strong>
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-4)",
          }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              style={{
                width: "44px",
                height: "52px",
                textAlign: "center",
                fontSize: "var(--text-xl)",
                fontWeight: "600",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-tertiary)",
                outline: "none",
              }}
            />
          ))}
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={otp.some((d) => !d)}>
          Verify Email
        </Button>
      </form>

      <p
        style={{
          textAlign: "center",
          marginTop: "var(--space-4)",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
        }}>
        Didn't receive the code?{" "}
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          style={{
            color: "var(--accent-blue)",
            fontWeight: "600",
            background: "none",
            border: "none",
            cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
          }}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
        </button>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "var(--space-10)" }}>
          Loading...
        </div>
      }>
      <VerifyEmailContent />
    </Suspense>
  );
}
