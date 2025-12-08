"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import gsap from "gsap";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/feed/PostCard";
import { postApi, userApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { socketClient } from "@/lib/socket";
import type { Post } from "@/lib/types";

interface FollowingUser {
  id: string;
  username: string;
  fullName: string;
  profilePhoto?: string;
  isOnline: boolean;
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const storiesRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch followed users with online status
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      try {
        const response = await userApi.getFollowingWithStatus();
        setFollowingUsers(response.data?.users || []);
      } catch (err) {
        console.error("Failed to fetch following users:", err);
      }
    };

    if (isAuthenticated) {
      fetchFollowingUsers();
    }
  }, [isAuthenticated]);

  // Listen for real-time online status updates
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleStatusChange = (data: {
      userId: string;
      isOnline: boolean;
    }) => {
      setFollowingUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId ? { ...u, isOnline: data.isOnline } : u
        )
      );
    };

    socket.on("user:status", handleStatusChange);

    return () => {
      socket.off("user:status", handleStatusChange);
    };
  }, []);

  // Fisher-Yates shuffle function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await postApi.getFeed(page, 10);
        const newPosts = response.data?.posts || [];

        if (page === 1) {
          // Shuffle posts on initial load
          setPosts(shuffleArray(newPosts));
        } else {
          // Shuffle and append for pagination
          setPosts((prev) => [...prev, ...shuffleArray(newPosts)]);
        }

        setHasMore(newPosts.length >= 10);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPosts();
    }
  }, [page, isAuthenticated]);

  // Subtle fade-in for stories
  useEffect(() => {
    if (storiesRef.current && followingUsers.length > 0) {
      gsap.fromTo(
        storiesRef.current.children,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        }
      );
    }
  }, [followingUsers]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: "var(--max-content-width)",
        margin: "0 auto",
      }}>
      {/* Following Users Row */}
      <div
        style={{
          marginBottom: "var(--space-4)",
          borderBottom: "1px solid var(--border-light)",
          paddingBottom: "var(--space-4)",
        }}>
        <div
          ref={storiesRef}
          style={{
            display: "flex",
            gap: "var(--space-4)",
            overflowX: "auto",
            padding: "0 var(--space-2)",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
          {/* Current User's Profile */}
          <Link
            href={`/profile/${user?.username}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
              flexShrink: 0,
              textDecoration: "none",
            }}>
            <Avatar src={user?.profilePhoto} name={user?.fullName} size="lg" />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-primary)",
                maxWidth: "64px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              Your story
            </span>
          </Link>

          {/* Following Users - Online users show gradient ring */}
          {followingUsers.map((followedUser) => (
            <Link
              key={followedUser.id}
              href={`/profile/${followedUser.username}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
                flexShrink: 0,
                textDecoration: "none",
              }}>
              <Avatar
                src={followedUser.profilePhoto}
                name={followedUser.fullName}
                size="lg"
                hasStory={followedUser.isOnline}
                hasUnseenStory={followedUser.isOnline}
              />
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-primary)",
                  maxWidth: "64px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                {followedUser.username}
              </span>
              {followedUser.isOnline && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "18px",
                    right: "2px",
                    width: "10px",
                    height: "10px",
                    background: "#44b700",
                    borderRadius: "50%",
                    border: "2px solid var(--bg-primary)",
                  }}
                />
              )}
            </Link>
          ))}

          {/* Empty state if no following users */}
          {followingUsers.length === 0 && (
            <div
              style={{
                padding: "var(--space-4)",
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
              }}>
              Follow users to see them here
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef}>
        {/* Error State */}
        {error && (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-8)",
              color: "var(--accent-red)",
            }}>
            <p style={{ marginBottom: "var(--space-2)" }}>{error}</p>
            <button
              onClick={() => setPage(1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "var(--accent-blue)",
                fontWeight: "600",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}>
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && posts.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "var(--space-10)",
            }}>
            <Loader2
              size={24}
              style={{
                color: "var(--text-secondary)",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : posts.length === 0 ? (
          /* Empty State */
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-10)",
            }}>
            <h3
              style={{
                fontSize: "var(--text-xl)",
                marginBottom: "var(--space-2)",
              }}>
              Welcome to Instagram
            </h3>
            <p style={{ color: "var(--text-secondary)" }}>
              Follow people to see their posts here
            </p>
          </div>
        ) : (
          <>
            {/* Posts */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-6)",
              }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "var(--space-6)",
                }}>
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  style={{
                    padding: "var(--space-3) var(--space-6)",
                    background: "var(--bg-tertiary)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontWeight: "500",
                    cursor: "pointer",
                    opacity: isLoading ? 0.5 : 1,
                  }}>
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
