"use client";

import React from "react";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  hasStory?: boolean;
  hasUnseenStory?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 56,
  xl: 77,
  "2xl": 150,
};

const getInitials = (name?: string): string => {
  if (!name) return "?";
  const words = name.split(" ");
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "Avatar",
  name,
  size = "md",
  hasStory = false,
  hasUnseenStory = false,
  onClick,
  className,
}) => {
  const dimension = sizeMap[size];
  const ringWidth = dimension > 50 ? 3 : 2;
  const ringGap = dimension > 50 ? 3 : 2;

  const avatarContent = (
    <div
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        borderRadius: "var(--radius-full)",
        overflow: "hidden",
        background: "var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={dimension}
          height={dimension}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
          unoptimized
        />
      ) : (
        <span
          style={{
            fontSize:
              dimension > 50
                ? "var(--text-2xl)"
                : dimension > 32
                ? "var(--text-base)"
                : "var(--text-xs)",
            fontWeight: "600",
            color: "var(--text-secondary)",
          }}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );

  // Wrap with story ring if applicable
  if (hasStory) {
    const outerSize = dimension + ringWidth * 2 + ringGap * 2;

    return (
      <div
        onClick={onClick}
        className={className}
        style={{
          width: `${outerSize}px`,
          height: `${outerSize}px`,
          padding: `${ringWidth}px`,
          borderRadius: "var(--radius-full)",
          background: hasUnseenStory
            ? "var(--gradient-story)"
            : "var(--border-color)",
          cursor: onClick ? "pointer" : "default",
          flexShrink: 0,
        }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: `${ringGap}px`,
            borderRadius: "var(--radius-full)",
            background: "var(--bg-primary)",
          }}>
          {avatarContent}
        </div>
      </div>
    );
  }

  // Without story ring
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}>
      {avatarContent}
    </div>
  );
};

export { Avatar };
export type { AvatarProps };
