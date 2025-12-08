import Notification, { NotificationType } from '@models/Notification.model';
import socketService from '@services/socket/socket.service';
import logger from '@utils/logger';

class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(
    recipientId: string,
    senderId: string,
    type: NotificationType,
    message: string,
    targetType?: 'post' | 'comment',
    targetId?: string
  ): Promise<void> {
    try {
      // Don't create notification if recipient is sender
      if (recipientId === senderId) {
        return;
      }

      // Create notification in database
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        message,
        targetType,
        target: targetId,
        isRead: false,
      });

      // Populate sender info for real-time emission
      await notification.populate('sender', 'username fullName profilePhoto');

      // Send real-time notification if user is online
      socketService.sendNotificationToUser(recipientId, {
        id: notification._id,
        sender: (notification as any).sender,
        type: notification.type,
        message: notification.message,
        targetType: notification.targetType,
        target: notification.target,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      logger.info(`Notification created: ${type} from ${senderId} to ${recipientId}`);
    } catch (error: any) {
      logger.error(`Error creating notification: ${error.message}`);
    }
  }

  /**
   * Get user notifications (paginated)
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: any[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find({ recipient: userId })
          .populate('sender', 'username fullName profilePhoto')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments({ recipient: userId }),
      ]);

      return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error(`Error fetching notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ recipient: userId, isRead: false });
    } catch (error: any) {
      logger.error(`Error getting unread count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true }
      );
      logger.info(`Notification ${notificationId} marked as read`);
    } catch (error: any) {
      logger.error(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );
      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error: any) {
      logger.error(`Error marking all notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
      logger.info(`Notification ${notificationId} deleted`);
    } catch (error: any) {
      logger.error(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create like notification
   */
  async createLikeNotification(
    targetOwnerId: string,
    likerId: string,
    targetType: 'post' | 'comment',
    targetId: string,
    likerUsername: string
  ): Promise<void> {
    const message = `${likerUsername} liked your ${targetType}`;
    await this.createNotification(targetOwnerId, likerId, 'like', message, targetType, targetId);
  }

  /**
   * Create comment notification
   */
  async createCommentNotification(
    postOwnerId: string,
    commenterId: string,
    postId: string,
    commenterUsername: string
  ): Promise<void> {
    const message = `${commenterUsername} commented on your post`;
    await this.createNotification(postOwnerId, commenterId, 'comment', message, 'post', postId);
  }

  /**
   * Create follow notification
   */
  async createFollowNotification(
    followedUserId: string,
    followerId: string,
    followerUsername: string
  ): Promise<void> {
    const message = `${followerUsername} started following you`;
    await this.createNotification(followedUserId, followerId, 'follow', message);
  }

  /**
   * Create mention notification
   */
  async createMentionNotification(
    mentionedUserId: string,
    mentionerId: string,
    targetType: 'post' | 'comment',
    targetId: string,
    mentionerUsername: string
  ): Promise<void> {
    const message = `${mentionerUsername} mentioned you in a ${targetType}`;
    await this.createNotification(mentionedUserId, mentionerId, 'mention', message, targetType, targetId);
  }

  /**
   * Create reply notification
   */
  async createReplyNotification(
    originalCommenterId: string,
    replierId: string,
    commentId: string,
    replierUsername: string
  ): Promise<void> {
    const message = `${replierUsername} replied to your comment`;
    await this.createNotification(originalCommenterId, replierId, 'reply', message, 'comment', commentId);
  }
}

export default new NotificationService();
