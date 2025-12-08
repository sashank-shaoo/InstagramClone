"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Bookmark } from "lucide-react";
import { savedApi, getErrorMessage } from "@/lib/api";
import { formatCount } from "@/lib/utils";
import type { Post } from "@/lib/types";

export default function SavedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      setIsLoading(true);
      try {
        const response = await savedApi.getSavedPosts(page, 30);
        const newPosts = response.data?.posts || [];
        if (newPosts.length > 0) {
          if (page === 1) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
          }
          setHasMore(page < (response.data?.pagination?.pages || 1));
        } else {
          setHasMore(false);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [page]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "var(--space-4) 0",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "var(--space-4)",
        }}>
        <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "600" }}>Saved</h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}>
          Only you can see what you&apos;ve saved
        </p>
      </div>

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
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-10)",
          }}>
          <Bookmark
            size={48}
            style={{
              color: "var(--text-secondary)",
              margin: "0 auto var(--space-4)",
            }}
          />
          <h3
            style={{
              fontSize: "var(--text-xl)",
              marginBottom: "var(--space-2)",
            }}>
            Nothing Saved Yet
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Save photos and videos that you want to see again.
          </p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "2px",
            }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                style={{
                  position: "relative",
                  paddingTop: "100%",
                  background: "var(--bg-tertiary)",
                }}>
                <Image
                  src={post.mediaUrl || post.thumbnailUrl || ""}
                  alt={post.caption || "Saved post"}
                  fill
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </Link>
            ))}
          </div>

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
  );
}
