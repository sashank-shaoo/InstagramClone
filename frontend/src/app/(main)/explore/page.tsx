"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, UserPlus, UserCheck, RefreshCw } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { postApi, userApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Post } from "@/lib/types";
import Link from "next/link";

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ExplorePage() {
  const { user: currentUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await postApi.getExplore(page, 20);
        let newPosts = response.data?.posts || [];

        // Shuffle posts for variety
        newPosts = shuffleArray(newPosts);

        // Initialize following state from API data
        const alreadyFollowing = new Set<string>();
        newPosts.forEach((post) => {
          if (post.user.isFollowing) {
            alreadyFollowing.add(post.user.id);
          }
        });

        if (page === 1) {
          setPosts(newPosts);
          setFollowingUsers(alreadyFollowing);
        } else {
          setPosts((prev) => [...prev, ...shuffleArray(newPosts)]);
          setFollowingUsers((prev) => {
            const combined = new Set(prev);
            alreadyFollowing.forEach((id) => combined.add(id));
            return combined;
          });
        }

        setHasMore(newPosts.length >= 20);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [page, refreshKey]);

  // Handle follow/unfollow
  const handleFollow = useCallback(
    async (userId: string, username: string) => {
      if (followLoading.has(userId)) return;

      setFollowLoading((prev) => new Set(prev).add(userId));
      const isFollowing = followingUsers.has(userId);

      try {
        if (isFollowing) {
          await userApi.unfollowUser(username);
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else {
          await userApi.followUser(username);
          setFollowingUsers((prev) => new Set(prev).add(userId));
          // Remove all posts from this user since they're now followed
          setPosts((prev) => prev.filter((post) => post.user.id !== userId));
        }
      } catch (err) {
        console.error("Follow error:", err);
      } finally {
        setFollowLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    },
    [followingUsers, followLoading]
  );

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  // Shuffle/refresh content
  const handleShuffle = () => {
    setPage(1);
    setPosts([]);
    setRefreshKey((prev) => prev + 1);
  };

  // Check if user is being followed (either from API or local state)
  const isUserFollowed = (userId: string, apiIsFollowing?: boolean) => {
    return followingUsers.has(userId) || apiIsFollowing === true;
  };

  // Group posts with unique users for showing follow buttons
  const getUniqueUserPosts = () => {
    const seenUsers = new Set<string>();
    return posts.map((post) => {
      const isFirstPostByUser = !seenUsers.has(post.user.id);
      seenUsers.add(post.user.id);
      return { post, showFollowSuggestion: isFirstPostByUser };
    });
  };

  const postsWithMeta = getUniqueUserPosts();

  return (
    <div>
      {/* Header with Shuffle Button */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "var(--bg-primary)",
          padding: "var(--space-4) 0",
          zIndex: 10,
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: "600",
          }}>
          Explore
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShuffle}
          disabled={isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}>
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Shuffle
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-8)",
            color: "var(--accent-red)",
          }}>
          {error}
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
            No posts to explore
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Be the first to share something!
          </p>
        </div>
      ) : (
        <>
          {/* Posts Feed */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
              maxWidth: "470px",
              margin: "0 auto",
            }}>
            {postsWithMeta.map(({ post }) => (
              <PostCard
                key={post.id}
                post={post}
                onFollow={(userId) => {
                  // Remove all posts from this user when followed
                  setPosts((prev) => prev.filter((p) => p.user.id !== userId));
                }}
              />
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
              <Button
                variant="secondary"
                onClick={loadMore}
                disabled={isLoading}>
                {isLoading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
