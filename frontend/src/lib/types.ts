// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio?: string;
  profilePhoto?: string;
  isEmailVerified: boolean;
  createdAt?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

// Auth types
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

// Post types
export interface Post {
  id: string;
  user: User;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  caption: string;
  hashtags: string[];
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
}

// Comment types
export interface Comment {
  id: string;
  post: string;
  user: User;
  text: string;
  parentComment?: string;
  likesCount: number;
  repliesCount: number;
  isLiked?: boolean;
  createdAt: string;
}

// Notification types
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "reply";

export interface Notification {
  id: string;
  recipient: string;
  sender: User;
  type: NotificationType;
  targetType?: "post" | "comment";
  target?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

// Socket event types
export interface SocketNotification {
  id: string;
  type: NotificationType;
  sender: User;
  message: string;
  createdAt: string;
}

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  timestamp: string;
}

// Messaging types
export interface Message {
  id: string;
  sender: User;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  isRead?: boolean;
  isMine: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: {
    text: string;
    sender: string;
    createdAt: string;
    readBy?: string[];
  };
  lastMessageAt: string;
  unreadCount: number;
}
