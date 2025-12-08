"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div style={{ width: "100%" }}>
        {label && (
          <label
            style={{
              display: "block",
              fontSize: "var(--text-sm)",
              fontWeight: "500",
              color: "var(--text-primary)",
              marginBottom: "var(--space-2)",
            }}>
            {label}
          </label>
        )}

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}>
          {leftIcon && (
            <div
              style={{
                position: "absolute",
                left: "var(--space-3)",
                color: isFocused
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                transition: "color var(--transition-fast)",
                pointerEvents: "none",
              }}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: "100%",
              height: "44px",
              padding: `var(--space-3) ${
                rightIcon || isPassword ? "var(--space-10)" : "var(--space-3)"
              } var(--space-3) ${
                leftIcon ? "var(--space-10)" : "var(--space-3)"
              }`,
              fontSize: "var(--text-sm)",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-tertiary)",
              border: `1px solid ${
                error
                  ? "var(--accent-red)"
                  : isFocused
                  ? "var(--border-color)"
                  : "var(--border-light)"
              }`,
              borderRadius: "var(--radius-sm)",
              outline: "none",
              transition:
                "border-color var(--transition-fast), background-color var(--transition-fast)",
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? "not-allowed" : "text",
              ...style,
            }}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              style={{
                position: "absolute",
                right: "var(--space-3)",
                color: "var(--text-secondary)",
                background: "none",
                border: "none",
                padding: "var(--space-1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}

          {rightIcon && !isPassword && (
            <div
              style={{
                position: "absolute",
                right: "var(--space-3)",
                color: "var(--text-secondary)",
                pointerEvents: "none",
              }}>
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            style={{
              marginTop: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--accent-red)",
            }}>
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            style={{
              marginTop: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
            }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
