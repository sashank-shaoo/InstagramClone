"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  X,
  Send,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatCount, formatRelativeTime } from "@/lib/utils";
import { postApi, savedApi, commentApi, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Post, Comment } from "@/lib/types";

interface ReelCardProps {
  reel: Post;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: () => void;
}

function ReelCard({
  reel,
  isActive,
  isMuted,
  onToggleMute,
  onOpenComments,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  // Play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  // Handle mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleVideoTap = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }

    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  const handleLike = async () => {
    if (!user) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(wasLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (wasLiked) {
        await postApi.unlikePost(reel.id);
      } else {
        await postApi.likePost(reel.id);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikesCount(wasLiked ? likesCount : likesCount - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    try {
      if (wasSaved) {
        await savedApi.unsavePost(reel.id);
      } else {
        await savedApi.savePost(reel.id);
      }
    } catch {
      setIsSaved(wasSaved);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
      // Show heart animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      {/* Video Container - Centered for desktop */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "450px",
          height: "100%",
          margin: "0 auto",
        }}>
        {/* Video */}
        <video
          ref={videoRef}
          src={reel.mediaUrl}
          poster={reel.thumbnailUrl}
          loop
          playsInline
          muted={isMuted}
          onClick={handleVideoTap}
          onDoubleClick={handleDoubleTap}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#000",
          }}
        />

        {/* Play/Pause Icon */}
        {showPlayIcon && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
            <div
              style={{
                background: "rgba(0,0,0,0.5)",
                borderRadius: "50%",
                padding: "20px",
              }}>
              {isPlaying ? (
                <Play size={48} fill="white" color="white" />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <div
                    style={{
                      width: 12,
                      height: 36,
                      background: "white",
                      marginRight: 8,
                    }}
                  />
                  <div style={{ width: 12, height: 36, background: "white" }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Double-tap heart animation */}
        {showHeart && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              animation: "heartPop 0.8s ease-out",
            }}>
            <Heart size={100} fill="#ff3040" color="#ff3040" />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "250px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
            pointerEvents: "none",
          }}
        />

        {/* Bottom info */}
        <div
          style={{
            position: "absolute",
            left: "16px",
            right: "70px",
            bottom: "20px",
            color: "white",
          }}>
          {/* User info */}
          {reel.user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}>
              <Link href={`/profile/${reel.user.username}`}>
                <Avatar
                  src={reel.user.profilePhoto}
                  name={reel.user.fullName}
                  size="md"
                />
              </Link>
              <Link
                href={`/profile/${reel.user.username}`}
                style={{
                  fontWeight: "700",
                  fontSize: "15px",
                  color: "white",
                  textDecoration: "none",
                }}>
                {reel.user.username}
              </Link>
              <button
                style={{
                  padding: "4px 12px",
                  border: "1px solid white",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}>
                Follow
              </button>
            </div>
          )}

          {/* Caption */}
          {reel.caption && (
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: "10px",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}>
              {reel.caption}
            </p>
          )}

          {/* Audio */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              opacity: 0.9,
            }}>
            <span style={{ fontSize: "14px" }}>🎵</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              Original audio • {reel.user?.username}
            </span>
          </div>
        </div>

        {/* Right side actions */}
        <div
          style={{
            position: "absolute",
            right: "12px",
            bottom: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
          }}>
          {/* Like */}
          <button
            onClick={handleLike}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}>
            <Heart
              size={30}
              fill={isLiked ? "#ff3040" : "none"}
              color={isLiked ? "#ff3040" : "white"}
              strokeWidth={isLiked ? 0 : 2}
            />
            <span style={{ fontSize: "12px", fontWeight: "600" }}>
              {formatCount(likesCount)}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={onOpenComments}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}>
            <MessageCircle size={30} strokeWidth={2} />
            <span style={{ fontSize: "12px", fontWeight: "600" }}>
              {formatCount(reel.commentsCount)}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}>
            <Bookmark
              size={30}
              fill={isSaved ? "white" : "none"}
              strokeWidth={2}
            />
          </button>

          {/* Share */}
          <button
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}>
            <Share2 size={28} strokeWidth={2} />
          </button>

          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              border: "none",
              color: "white",
              cursor: "pointer",
              marginTop: "8px",
            }}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Comments Modal Component
interface CommentsModalProps {
  reel: Post;
  isOpen: boolean;
  onClose: () => void;
}

function CommentsModal({ reel, isOpen, onClose }: CommentsModalProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, reel.id]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const response = await commentApi.getComments(reel.id, 1, 50);
      setComments(response.data?.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const response = await commentApi.createComment(reel.id, {
        text: commentText.trim(),
      });

      if (response.data?.comment) {
        setComments((prev) => [response.data!.comment, ...prev]);
        setCommentText("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "70vh",
          background: "var(--bg-primary)",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s ease-out",
        }}>
        {/* Handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px",
          }}>
          <div
            style={{
              width: "40px",
              height: "4px",
              background: "var(--border-color)",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px 12px",
            borderBottom: "1px solid var(--border-light)",
          }}>
          <div style={{ width: 24 }} />
          <h3 style={{ fontWeight: "700", fontSize: "16px" }}>Comments</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}>
            <X size={24} />
          </button>
        </div>

        {/* Comments list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
          }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "20px",
              }}>
              <Loader2
                size={24}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--text-secondary)",
                }}
              />
            </div>
          ) : comments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-secondary)",
              }}>
              <MessageCircle
                size={48}
                style={{ marginBottom: "12px", opacity: 0.5 }}
              />
              <p style={{ fontWeight: "600", marginBottom: "4px" }}>
                No comments yet
              </p>
              <p style={{ fontSize: "14px" }}>Be the first to comment!</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {comments.map((comment) => (
                <div key={comment.id} style={{ display: "flex", gap: "12px" }}>
                  <Link href={`/profile/${comment.user?.username}`}>
                    <Avatar
                      src={comment.user?.profilePhoto}
                      name={comment.user?.fullName || "User"}
                      size="sm"
                    />
                  </Link>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "4px" }}>
                      <Link
                        href={`/profile/${comment.user?.username}`}
                        style={{
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          marginRight: "8px",
                        }}>
                        {comment.user?.username}
                      </Link>
                      <span style={{ fontSize: "14px" }}>{comment.text}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}>
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          fontWeight: "600",
                        }}>
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment input */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderTop: "1px solid var(--border-light)",
            background: "var(--bg-primary)",
          }}>
          {user && (
            <Avatar src={user.profilePhoto} name={user.fullName} size="sm" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "none",
              borderRadius: "20px",
              fontSize: "14px",
              outline: "none",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            style={{
              background: "none",
              border: "none",
              cursor: commentText.trim() ? "pointer" : "default",
              color: commentText.trim()
                ? "var(--accent-blue)"
                : "var(--text-secondary)",
              padding: "8px",
            }}>
            {isSubmitting ? (
              <Loader2
                size={20}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch reels (video posts)
  useEffect(() => {
    const fetchReels = async () => {
      setIsLoading(true);
      try {
        const response = await postApi.getFeed(1, 50);
        const videoPosts = (response.data?.posts || []).filter(
          (post) => post.mediaType === "video"
        );
        setReels(videoPosts);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReels();
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const reelHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / reelHeight);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < reels.length) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, reels.length]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
        }}>
        <Loader2
          size={32}
          style={{ color: "white", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
          color: "white",
          padding: "20px",
          textAlign: "center",
        }}>
        <p>{error}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#000",
          color: "white",
          padding: "20px",
          textAlign: "center",
          gap: "16px",
        }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #833AB4 0%, #FD1D1D 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Play size={40} fill="white" color="white" />
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "700" }}>No Reels Yet</h2>
        <p style={{ opacity: 0.7 }}>
          Upload a video to create your first Reel!
        </p>
        <Link
          href="/create"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(90deg, #833AB4 0%, #FD1D1D 100%)",
            borderRadius: "8px",
            color: "white",
            textDecoration: "none",
            fontWeight: "600",
          }}>
          Create Reel
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          position: "fixed",
          inset: 0,
          top: 0,
          bottom: "var(--nav-height-mobile)",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          background: "#000",
          WebkitOverflowScrolling: "touch",
        }}>
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            style={{
              height: "100%",
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
            }}>
            <ReelCard
              reel={reel}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onOpenComments={() => setShowComments(true)}
            />
          </div>
        ))}
      </div>

      {/* Comments Modal */}
      {reels[activeIndex] && (
        <CommentsModal
          reel={reels[activeIndex]}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @media (min-width: 768px) {
          div[ref] {
            left: var(--sidebar-width-compact) !important;
          }
        }
        @media (min-width: 1024px) {
          div[ref] {
            left: var(--sidebar-width-full) !important;
          }
        }
      `}</style>
    </>
  );
}
