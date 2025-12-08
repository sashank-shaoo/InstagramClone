import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwtService from "@services/auth/jwt.service";
import logger from "@utils/logger";

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on("connection", this.handleConnection.bind(this));

    logger.info("Socket.io server initialized");
    return this.io;
  }

  /**
   * Authenticate socket connection using JWT
   */
  private async authenticateSocket(
    socket: Socket,
    next: Function
  ): Promise<void> {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwtService.verifyAccessToken(token);
      (socket as any).userId = decoded.id;
      (socket as any).username = decoded.username;

      next();
    } catch (error: any) {
      logger.error(`Socket authentication error: ${error.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const userId = (socket as any).userId;
    const username = (socket as any).username;

    logger.info(`User connected: ${username} (${userId}) [${socket.id}]`);

    // Add socket to user's socket set
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit online status
    this.broadcastUserStatus(userId, true);

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(socket, userId, username);
    });

    // Handle typing indicator
    socket.on("typing:start", (data: { postId: string }) => {
      socket
        .to(`post:${data.postId}`)
        .emit("user:typing", { userId, username });
    });

    socket.on("typing:stop", (data: { postId: string }) => {
      socket.to(`post:${data.postId}`).emit("user:stop-typing", { userId });
    });

    // Handle post room join/leave
    socket.on("post:join", (postId: string) => {
      socket.join(`post:${postId}`);
    });

    socket.on("post:leave", (postId: string) => {
      socket.leave(`post:${postId}`);
    });
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(
    socket: Socket,
    userId: string,
    username: string
  ): void {
    logger.info(`User disconnected: ${username} (${userId}) [${socket.id}]`);

    // Remove socket from user's socket set
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);

      // If user has no more active sockets, mark as offline
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        this.broadcastUserStatus(userId, false);
      }
    }
  }

  /**
   * Broadcast user online/offline status
   */
  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    if (this.io) {
      this.io.emit("user:status", { userId, isOnline, timestamp: new Date() });
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit("notification", notification);
      logger.info(`Notification sent to user ${userId}`);
    }
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: any): void {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Emit post update (new like, comment, etc.)
   */
  emitPostUpdate(postId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`post:${postId}`).emit(event, data);
    }
  }

  /**
   * Get Socket.io instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Send a new message to a user
   */
  sendMessageToUser(userId: string, message: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit("message:new", message);
      logger.info(`Message sent to user ${userId}`);
    }
  }

  /**
   * Notify user that their message was read
   */
  sendMessageReadNotification(
    userId: string,
    conversationId: string,
    readBy: string
  ): void {
    if (this.io) {
      this.io
        .to(`user:${userId}`)
        .emit("message:read", { conversationId, readBy });
    }
  }

  /**
   * Handle user joining a conversation room
   */
  joinConversation(socketId: string, conversationId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`conversation:${conversationId}`);
      }
    }
  }

  /**
   * Emit typing indicator to conversation
   */
  emitTyping(
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ): void {
    if (this.io) {
      this.io
        .to(`conversation:${conversationId}`)
        .emit("conversation:typing", { userId, username, isTyping });
    }
  }
}

export default new SocketService();
