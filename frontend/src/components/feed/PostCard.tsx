"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  UserPlus,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime, formatCount } from "@/lib/utils";
import { postApi, savedApi, commentApi, userApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Post as PostType, Comment } from "@/lib/types";

interface PostCardProps {
  post: PostType;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  showFollowButton?: boolean;
  onFollow?: (userId: string) => void;
}

export function PostCard({
  post,
  onShare,
  showFollowButton = false,
  onFollow,
}: PostCardProps) {
  const { user: currentUser } = useAuthStore();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(
    post.user.isFollowing || false
  );
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Comments modal state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [modalCommentText, setModalCommentText] = useState("");

  const heartRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const modalCommentInputRef = useRef<HTMLInputElement>(null);

  // Subtle fade-in animation on mount
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, []);

  // Fetch comments when modal opens
  useEffect(() => {
    if (showCommentsModal) {
      fetchComments();
    }
  }, [showCommentsModal]);

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await commentApi.getComments(post.id, 1, 50);
      setComments(response.data?.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(wasLiked ? likesCount - 1 : likesCount + 1);

    // Subtle heart animation
    if (heartRef.current && !wasLiked) {
      gsap.fromTo(
        heartRef.current,
        { scale: 1 },
        {
          scale: 1.2,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
        }
      );
    }

    try {
      if (wasLiked) {
        await postApi.unlikePost(post.id);
      } else {
        await postApi.likePost(post.id);
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikesCount(wasLiked ? likesCount : likesCount - 1);
      console.error("Failed to like/unlike post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    try {
      if (wasSaved) {
        await savedApi.unsavePost(post.id);
      } else {
        await savedApi.savePost(post.id);
      }
    } catch (error) {
      setIsSaved(wasSaved);
      console.error("Failed to save/unsave post:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitComment = async (fromModal: boolean = false) => {
    const text = fromModal ? modalCommentText : commentText;
    if (!text.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const response = await commentApi.createComment(post.id, {
        text: text.trim(),
      });
      if (response.data?.comment) {
        setComments((prev) => [response.data!.comment, ...prev]);
        setCommentsCount(commentsCount + 1);
      }
      if (fromModal) {
        setModalCommentText("");
      } else {
        setCommentText("");
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleKeyPress = (
    e: React.KeyboardEvent,
    fromModal: boolean = false
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment(fromModal);
    }
  };

  // Focus comment input when comment icon is clicked
  const handleCommentIconClick = () => {
    commentInputRef.current?.focus();
  };

  // Open comments modal
  const handleViewAllComments = () => {
    setShowCommentsModal(true);
  };

  // Handle follow
  const handleFollow = async () => {
    if (isFollowLoading || !post.user.username) return;
    setIsFollowLoading(true);

    try {
      if (isFollowing) {
        await userApi.unfollowUser(post.user.username);
        setIsFollowing(false);
      } else {
        await userApi.followUser(post.user.username);
        setIsFollowing(true);
        // Notify parent to remove this post (on Explore page)
        if (onFollow) {
          onFollow(post.user.id);
        }
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Double tap to like
  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  return (
    <>
      <article
        ref={cardRef}
        style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-light)",
          paddingBottom: "var(--space-4)",
          marginBottom: "var(--space-2)",
        }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
          }}>
          <Link
            href={`/profile/${post.user.username}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}>
            <Avatar
              src={post.user.profilePhoto}
              name={post.user.fullName}
              size="sm"
            />
            <div>
              <span
                style={{
                  fontWeight: "600",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-primary)",
                }}>
                {post.user.username}
              </span>
              {post.location && (
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                  }}>
                  {post.location.name}
                </p>
              )}
            </div>
          </Link>

          {/* Follow Button - Only show if not the current user's post */}
          {currentUser?.id !== post.user.id && (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontWeight: "600",
                fontSize: "var(--text-sm)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                transition: "all var(--transition-fast)",
                background: isFollowing ? "transparent" : "var(--accent-blue)",
                color: isFollowing ? "var(--text-primary)" : "white",
                border: isFollowing ? "1px solid var(--border-color)" : "none",
                cursor: isFollowLoading ? "wait" : "pointer",
                opacity: isFollowLoading ? 0.7 : 1,
              }}>
              {isFollowLoading ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : isFollowing ? (
                <>
                  <UserCheck size={14} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Follow
                </>
              )}
            </button>
          )}
        </div>

        {/* Image */}
        <div
          style={{
            position: "relative",
            background: "var(--bg-tertiary)",
          }}
          onDoubleClick={handleDoubleTap}>
          {post.mediaType === "video" ? (
            <video
              src={post.mediaUrl}
              poster={post.thumbnailUrl}
              controls
              playsInline
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "600px",
                objectFit: "contain",
                background: "#000",
              }}
            />
          ) : (
            <Image
              src={post.mediaUrl || post.thumbnailUrl || ""}
              alt={post.caption || "Post"}
              width={500}
              height={500}
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "1",
                objectFit: "cover",
              }}
              unoptimized
            />
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-2)",
            }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
              }}>
              <button
                ref={heartRef}
                onClick={handleLike}
                disabled={isLiking}
                style={{
                  color: isLiked ? "var(--accent-red)" : "var(--text-primary)",
                  transition: "color var(--transition-fast)",
                }}>
                <Heart
                  size={24}
                  fill={isLiked ? "var(--accent-red)" : "none"}
                  strokeWidth={isLiked ? 0 : 1.5}
                />
              </button>

              <button
                onClick={handleCommentIconClick}
                style={{ color: "var(--text-primary)" }}>
                <MessageCircle size={24} strokeWidth={1.5} />
              </button>

              <button
                onClick={() => onShare?.(post.id)}
                style={{ color: "var(--text-primary)" }}>
                <Send size={24} strokeWidth={1.5} />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ color: "var(--text-primary)" }}>
              <Bookmark
                size={24}
                fill={isSaved ? "var(--text-primary)" : "none"}
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* Likes */}
          <p
            style={{
              fontWeight: "600",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-2)",
            }}>
            {formatCount(likesCount)} likes
          </p>

          {/* Caption */}
          {post.caption && (
            <p
              style={{
                fontSize: "var(--text-sm)",
                lineHeight: "1.4",
                marginBottom: "var(--space-2)",
              }}>
              <Link
                href={`/profile/${post.user.username}`}
                style={{ fontWeight: "600" }}>
                {post.user.username}
              </Link>{" "}
              {post.caption}
            </p>
          )}

          {/* Comments count - View all */}
          {commentsCount > 0 && (
            <button
              onClick={handleViewAllComments}
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-2)",
                display: "block",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}>
              View all {formatCount(commentsCount)} comments
            </button>
          )}

          {/* Comment input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}>
            <input
              ref={commentInputRef}
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
              style={{
                flex: 1,
                fontSize: "var(--text-sm)",
                color: "var(--text-primary)",
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
            {commentText.trim() && (
              <button
                onClick={() => handleSubmitComment()}
                disabled={isSubmittingComment}
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "600",
                  color: "var(--accent-blue)",
                  opacity: isSubmittingComment ? 0.5 : 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}>
                Post
              </button>
            )}
          </div>

          {/* Timestamp */}
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              marginTop: "var(--space-2)",
              textTransform: "uppercase",
            }}>
            {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      </article>

      {/* Comments Modal */}
      {showCommentsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowCommentsModal(false)}>
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              width: "100%",
              maxWidth: "500px",
              height: "70vh",
              display: "flex",
              flexDirection: "column",
              animation: "slideUp 0.3s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Drag Handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "var(--space-3)",
              }}>
              <div
                style={{
                  width: "40px",
                  height: "4px",
                  background: "var(--border-color)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>

            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--space-2) var(--space-4) var(--space-4)",
                borderBottom: "1px solid var(--border-light)",
                position: "relative",
              }}>
              <h2
                style={{
                  fontWeight: "600",
                  fontSize: "var(--text-base)",
                }}>
                Comments
              </h2>
              <button
                onClick={() => setShowCommentsModal(false)}
                style={{
                  position: "absolute",
                  right: "var(--space-4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  padding: "var(--space-1)",
                }}>
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "var(--space-4)",
              }}>
              {commentsLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}>
                  <Loader2
                    size={28}
                    style={{
                      color: "var(--text-secondary)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              ) : comments.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--text-secondary)",
                  }}>
                  <MessageCircle
                    size={48}
                    strokeWidth={1}
                    style={{ marginBottom: "var(--space-4)" }}
                  />
                  <h3
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-2)",
                    }}>
                    No comments yet
                  </h3>
                  <p style={{ fontSize: "var(--text-sm)" }}>
                    Start the conversation.
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-3)",
                      marginBottom: "var(--space-5)",
                    }}>
                    <Link
                      href={`/profile/${comment.user.username}`}
                      style={{ flexShrink: 0 }}>
                      <Avatar
                        src={comment.user.profilePhoto}
                        name={comment.user.fullName}
                        size="sm"
                      />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/profile/${comment.user.username}`}
                        style={{
                          fontWeight: "600",
                          fontSize: "var(--text-sm)",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          display: "block",
                          marginBottom: "var(--space-1)",
                        }}>
                        {comment.user.username}
                      </Link>
                      <p
                        style={{
                          fontSize: "var(--text-sm)",
                          lineHeight: "1.5",
                          wordBreak: "break-word",
                          color: "var(--text-primary)",
                          marginBottom: "var(--space-1)",
                        }}>
                        {comment.text}
                      </p>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-secondary)",
                        }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input in Modal */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-4)",
                borderTop: "1px solid var(--border-light)",
                background: "var(--bg-primary)",
              }}>
              <Avatar src={post.user.profilePhoto} name="You" size="sm" />
              <input
                ref={modalCommentInputRef}
                type="text"
                placeholder="Add a comment..."
                value={modalCommentText}
                onChange={(e) => setModalCommentText(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, true)}
                autoFocus
                style={{
                  flex: 1,
                  padding: "var(--space-2) 0",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleSubmitComment(true)}
                disabled={!modalCommentText.trim() || isSubmittingComment}
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "600",
                  color: modalCommentText.trim()
                    ? "var(--accent-blue)"
                    : "var(--text-secondary)",
                  opacity: isSubmittingComment ? 0.5 : 1,
                  background: "none",
                  border: "none",
                  cursor: modalCommentText.trim() ? "pointer" : "default",
                }}>
                Post
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
