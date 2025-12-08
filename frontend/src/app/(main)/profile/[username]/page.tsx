"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Grid3X3,
  Bookmark,
  Users,
  Settings,
  UserPlus,
  UserCheck,
  X,
  Key,
  LogOut,
  Eye,
  EyeOff,
  Heart,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  userApi,
  postApi,
  savedApi,
  authApi,
  notificationApi,
  getErrorMessage,
} from "@/lib/api";
import { formatCount, formatRelativeTime } from "@/lib/utils";
import type { User, Post, Notification } from "@/lib/types";

type TabType = "posts" | "saved" | "notifications";

interface FollowingUser {
  id: string;
  username: string;
  fullName: string;
  profilePhoto?: string;
  isOnline?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, logout } = useAuthStore();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followingList, setFollowingList] = useState<FollowingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState<Set<string>>(
    new Set()
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isOwnProfile = currentUser?.username === username;

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await userApi.getProfile(username);
        setProfileUser(response.data?.user || null);
        setIsFollowing(response.data?.user?.isFollowing || false);
      } catch (err) {
        setError(getErrorMessage(err));
        if (isOwnProfile && currentUser) {
          setProfileUser(currentUser);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile, currentUser]);

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      try {
        const response = await postApi.getUserPosts(username, 1, 30);
        setPosts(response.data?.posts || []);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };

    if (username) {
      fetchPosts();
    }
  }, [username]);

  // Fetch saved posts (only for own profile)
  useEffect(() => {
    const fetchSaved = async () => {
      if (!isOwnProfile || activeTab !== "saved") return;
      setSavedLoading(true);
      try {
        const response = await savedApi.getSavedPosts(1, 30);
        setSavedPosts(response.data?.posts || []);
      } catch (err) {
        console.error("Failed to fetch saved posts:", err);
      } finally {
        setSavedLoading(false);
      }
    };

    fetchSaved();
  }, [isOwnProfile, activeTab]);

  // Fetch notifications (only for own profile, only "like" type)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isOwnProfile || activeTab !== "notifications") return;
      setNotificationsLoading(true);
      try {
        const response = await notificationApi.getNotifications(1, 50);
        // Filter to only show "like" notifications
        const likeNotifications = (response.data?.notifications || []).filter(
          (n) => n.type === "like"
        );
        setNotifications(likeNotifications);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, [isOwnProfile, activeTab]);

  // Fetch following list
  const fetchFollowing = useCallback(async () => {
    if (!isOwnProfile) return;
    setFollowingLoading(true);
    try {
      const response = await userApi.getFollowingWithStatus();
      setFollowingList(response.data?.users || []);
    } catch (err) {
      console.error("Failed to fetch following:", err);
    } finally {
      setFollowingLoading(false);
    }
  }, [isOwnProfile]);

  // Handle follow/unfollow for profile
  const handleFollow = async () => {
    if (isFollowLoading || !profileUser) return;
    setIsFollowLoading(true);

    try {
      if (isFollowing) {
        await userApi.unfollowUser(profileUser.username);
        setIsFollowing(false);
      } else {
        await userApi.followUser(profileUser.username);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Handle unfollow from following list
  const handleUnfollow = async (user: FollowingUser) => {
    if (unfollowLoading.has(user.id)) return;

    setUnfollowLoading((prev) => new Set(prev).add(user.id));

    try {
      await userApi.unfollowUser(user.username);
      setFollowingList((prev) => prev.filter((u) => u.id !== user.id));
      if (profileUser) {
        setProfileUser({
          ...profileUser,
          followingCount: Math.max(0, (profileUser.followingCount || 0) - 1),
        });
      }
    } catch (err) {
      console.error("Unfollow error:", err);
    } finally {
      setUnfollowLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Open following modal
  const openFollowingModal = () => {
    if (isOwnProfile) {
      setShowFollowingModal(true);
      fetchFollowing();
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
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
    );
  }

  if (error && !profileUser) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-10)",
        }}>
        <h2
          style={{
            fontSize: "var(--text-xl)",
            marginBottom: "var(--space-2)",
          }}>
          User not found
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          @{username} doesn&apos;t exist
        </p>
      </div>
    );
  }

  const currentPosts = activeTab === "posts" ? posts : savedPosts;
  const currentLoading = activeTab === "posts" ? postsLoading : savedLoading;

  return (
    <div>
      {/* Profile Header */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-6)",
          padding: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <Avatar
            src={profileUser?.profilePhoto}
            name={profileUser?.fullName}
            size="xl"
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Username */}
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "400",
              marginBottom: "var(--space-3)",
            }}>
            {profileUser?.username}
          </h1>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginBottom: "var(--space-3)",
              flexWrap: "wrap",
            }}>
            {isOwnProfile ? (
              <>
                <Link href="/edit-profile">
                  <Button variant="secondary" size="sm">
                    Edit profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettingsModal(true)}
                  style={{ padding: "var(--space-2)" }}>
                  <Settings size={20} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={isFollowing ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  leftIcon={
                    isFollowing ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )
                  }>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="secondary" size="sm">
                  Message
                </Button>
              </>
            )}
          </div>

          {/* Stats - Desktop */}
          <div
            className="desktop-stats"
            style={{
              display: "none",
              gap: "var(--space-8)",
              marginBottom: "var(--space-3)",
            }}>
            <span>
              <strong>
                {formatCount(profileUser?.postsCount || posts.length)}
              </strong>{" "}
              posts
            </span>
            <button
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              <strong>{formatCount(profileUser?.followersCount || 0)}</strong>{" "}
              followers
            </button>
            <button
              onClick={openFollowingModal}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              <strong>{formatCount(profileUser?.followingCount || 0)}</strong>{" "}
              following
            </button>
          </div>

          {/* Bio - Desktop */}
          <div className="desktop-bio" style={{ display: "none" }}>
            <p style={{ fontWeight: "600" }}>{profileUser?.fullName}</p>
            {profileUser?.bio && (
              <p style={{ whiteSpace: "pre-wrap" }}>{profileUser.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bio - Mobile */}
      <div
        className="mobile-bio"
        style={{
          padding: "0 var(--space-4) var(--space-4)",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: "var(--border-light)",
        }}>
        <p style={{ fontWeight: "600", fontSize: "var(--text-sm)" }}>
          {profileUser?.fullName}
        </p>
        {profileUser?.bio && (
          <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>
            {profileUser.bio}
          </p>
        )}
      </div>

      {/* Stats - Mobile */}
      <div
        className="mobile-stats"
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "var(--space-3) 0",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: "var(--border-light)",
          textAlign: "center",
        }}>
        <div>
          <div style={{ fontWeight: "600" }}>
            {formatCount(profileUser?.postsCount || posts.length)}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
            }}>
            posts
          </div>
        </div>
        <button
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ fontWeight: "600" }}>
            {formatCount(profileUser?.followersCount || 0)}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
            }}>
            followers
          </div>
        </button>
        <button
          onClick={openFollowingModal}
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ fontWeight: "600" }}>
            {formatCount(profileUser?.followingCount || 0)}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
            }}>
            following
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "var(--space-4)",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: "var(--border-light)",
        }}>
        <button
          onClick={() => setActiveTab("posts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            borderBottomWidth: "1px",
            borderBottomStyle: "solid",
            borderBottomColor:
              activeTab === "posts" ? "var(--text-primary)" : "transparent",
            color:
              activeTab === "posts"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            fontSize: "var(--text-xs)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontWeight: "600",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}>
          <Grid3X3 size={12} />
          Posts
        </button>

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab("saved")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              borderBottomWidth: "1px",
              borderBottomStyle: "solid",
              borderBottomColor:
                activeTab === "saved" ? "var(--text-primary)" : "transparent",
              color:
                activeTab === "saved"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: "600",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
            }}>
            <Bookmark size={12} />
            Saved
          </button>
        )}

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab("notifications")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              borderBottomWidth: "1px",
              borderBottomStyle: "solid",
              borderBottomColor:
                activeTab === "notifications"
                  ? "var(--text-primary)"
                  : "transparent",
              color:
                activeTab === "notifications"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: "600",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
            }}>
            <Heart size={12} />
            Notifications
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "notifications" ? (
        // Notifications Tab Content
        notificationsLoading ? (
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
        ) : notifications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-10)",
            }}>
            <Heart
              size={40}
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
              No Notifications
            </h3>
            <p style={{ color: "var(--text-secondary)" }}>
              When someone likes your posts, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          <div style={{ padding: "var(--space-2)" }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: notification.isRead
                    ? "transparent"
                    : "var(--bg-secondary)",
                }}>
                <Link href={`/profile/${notification.sender.username}`}>
                  <Avatar
                    src={notification.sender.profilePhoto}
                    name={notification.sender.fullName}
                    size="md"
                  />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "var(--text-sm)" }}>
                    <Link
                      href={`/profile/${notification.sender.username}`}
                      style={{
                        fontWeight: "600",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}>
                      {notification.sender.username}
                    </Link>{" "}
                    {notification.message}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                    }}>
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                {notification.target && (
                  <Link href={`/post/${notification.target}`}>
                    <Heart
                      size={16}
                      fill="var(--accent-red)"
                      style={{ color: "var(--accent-red)" }}
                    />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // Posts/Saved Grid Content
        <>
          {currentLoading ? (
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
          ) : currentPosts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-10)",
              }}>
              {activeTab === "posts" ? (
                <>
                  <Grid3X3
                    size={40}
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
                    {isOwnProfile ? "Share Photos" : "No Posts Yet"}
                  </h3>
                  {isOwnProfile && (
                    <p style={{ color: "var(--text-secondary)" }}>
                      When you share photos, they will appear here.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Bookmark
                    size={40}
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
                    No Saved Posts
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Save posts to see them here.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "2px",
              }}>
              {currentPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    position: "relative",
                    paddingTop: "100%",
                    background: "var(--bg-tertiary)",
                    cursor: "pointer",
                  }}>
                  <Image
                    src={post.thumbnailUrl || post.mediaUrl || ""}
                    alt=""
                    fill
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                  {post.mediaType === "video" && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        color: "white",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                      }}>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
          onClick={() => setShowFollowingModal(false)}>
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4)",
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: "var(--border-light)",
              }}>
              <h2 style={{ fontWeight: "600" }}>Following</h2>
              <button
                onClick={() => setShowFollowingModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{ flex: 1, overflowY: "auto", padding: "var(--space-2)" }}>
              {followingLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "var(--space-6)",
                  }}>
                  <Loader2
                    size={24}
                    style={{
                      color: "var(--text-secondary)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              ) : followingList.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-6)",
                    color: "var(--text-secondary)",
                  }}>
                  <Users
                    size={40}
                    style={{ margin: "0 auto var(--space-4)" }}
                  />
                  <p>You&apos;re not following anyone yet.</p>
                </div>
              ) : (
                followingList.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-3)",
                    }}>
                    <Link
                      href={`/profile/${user.username}`}
                      onClick={() => setShowFollowingModal(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        textDecoration: "none",
                        color: "inherit",
                      }}>
                      <Avatar
                        src={user.profilePhoto}
                        alt={user.username}
                        size="md"
                        hasStory={user.isOnline}
                        hasUnseenStory={user.isOnline}
                      />
                      <div>
                        <p style={{ fontWeight: "600" }}>{user.username}</p>
                        <p
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-secondary)",
                          }}>
                          {user.fullName}
                        </p>
                      </div>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUnfollow(user)}
                      disabled={unfollowLoading.has(user.id)}>
                      {unfollowLoading.has(user.id) ? "..." : "Unfollow"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
          onClick={() => setShowSettingsModal(false)}>
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4)",
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: "var(--border-light)",
              }}>
              <h2 style={{ fontWeight: "600" }}>Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
              {/* Change Password Section */}
              <div style={{ marginBottom: "var(--space-6)" }}>
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-base)",
                    fontWeight: "600",
                    marginBottom: "var(--space-4)",
                  }}>
                  <Key size={18} />
                  Change Password
                </h3>

                <form onSubmit={handlePasswordChange}>
                  {passwordError && (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "var(--accent-red)",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "var(--space-3)",
                        fontSize: "var(--text-sm)",
                      }}>
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div
                      style={{
                        background: "rgba(34, 197, 94, 0.1)",
                        color: "#22c55e",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "var(--space-3)",
                        fontSize: "var(--text-sm)",
                      }}>
                      {passwordSuccess}
                    </div>
                  )}

                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{ position: "relative" }}>
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}>
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{ position: "relative" }}>
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}>
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={passwordLoading}>
                    Update Password
                  </Button>
                </form>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: "1px",
                  background: "var(--border-light)",
                  margin: "var(--space-4) 0",
                }}
              />

              {/* Logout */}
              <Button
                variant="danger"
                fullWidth
                onClick={handleLogout}
                leftIcon={<LogOut size={18} />}>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
          onClick={() => setSelectedPost(null)}>
          {/* Close button */}
          <button
            onClick={() => setSelectedPost(null)}
            style={{
              position: "absolute",
              top: "var(--space-4)",
              right: "var(--space-4)",
              color: "white",
              background: "none",
              border: "none",
              cursor: "pointer",
              zIndex: 1001,
            }}>
            <X size={28} />
          </button>

          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* User header */}
            {selectedPost.user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  borderBottom: "1px solid var(--border-light)",
                }}>
                <Link href={`/profile/${selectedPost.user.username}`}>
                  <Avatar
                    src={selectedPost.user.profilePhoto}
                    name={selectedPost.user.fullName}
                    size="sm"
                  />
                </Link>
                <Link
                  href={`/profile/${selectedPost.user.username}`}
                  style={{
                    fontWeight: "600",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}>
                  {selectedPost.user.username}
                </Link>
              </div>
            )}

            {/* Media */}
            <div
              style={{
                flex: 1,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
              {selectedPost.mediaType === "video" ? (
                <video
                  src={selectedPost.mediaUrl}
                  poster={selectedPost.thumbnailUrl}
                  controls
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Image
                  src={selectedPost.mediaUrl}
                  alt={selectedPost.caption || "Post"}
                  width={900}
                  height={900}
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "70vh",
                    objectFit: "contain",
                  }}
                  unoptimized
                />
              )}
            </div>

            {/* Post info */}
            <div style={{ padding: "var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  marginBottom: "var(--space-2)",
                }}>
                <Heart size={24} strokeWidth={1.5} />
                <span style={{ fontWeight: "600", fontSize: "var(--text-sm)" }}>
                  {formatCount(selectedPost.likesCount)} likes
                </span>
              </div>
              {selectedPost.caption && (
                <p style={{ fontSize: "var(--text-sm)", lineHeight: "1.5" }}>
                  {selectedPost.user && (
                    <span
                      style={{
                        fontWeight: "600",
                        marginRight: "var(--space-2)",
                      }}>
                      {selectedPost.user.username}
                    </span>
                  )}
                  {selectedPost.caption}
                </p>
              )}
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  marginTop: "var(--space-2)",
                }}>
                {formatRelativeTime(selectedPost.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @media (min-width: 768px) {
          .mobile-bio,
          .mobile-stats {
            display: none !important;
          }
          .desktop-stats,
          .desktop-bio {
            display: flex !important;
          }
          .desktop-bio {
            flex-direction: column;
            gap: var(--space-1);
          }
        }
      `}</style>
    </div>
  );
}
