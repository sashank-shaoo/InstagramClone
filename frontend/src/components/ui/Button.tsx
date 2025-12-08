"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-2)",
      fontWeight: "600",
      borderRadius: "var(--radius-md)",
      border: "none",
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      opacity: disabled || isLoading ? 0.5 : 1,
      transition: "all var(--transition-fast)",
      WebkitTapHighlightColor: "transparent",
      width: fullWidth ? "100%" : "auto",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: "var(--accent-blue)",
        color: "white",
      },
      secondary: {
        background: "var(--bg-tertiary)",
        color: "var(--text-primary)",
      },
      ghost: {
        background: "transparent",
        color: "var(--accent-blue)",
      },
      danger: {
        background: "var(--accent-red)",
        color: "white",
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        height: "32px",
        padding: "0 var(--space-3)",
        fontSize: "var(--text-sm)",
      },
      md: {
        height: "36px",
        padding: "0 var(--space-4)",
        fontSize: "var(--text-base)",
      },
      lg: {
        height: "44px",
        padding: "0 var(--space-5)",
        fontSize: "var(--text-base)",
      },
    };

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={combinedStyles}
        {...props}>
        {isLoading ? (
          <span
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "var(--radius-full)",
              animation: "spin 0.8s linear infinite",
            }}
          />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
