import notificationService from '@services/notification.service';
import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/error-handler.middleware';

class NotificationController {
  /**
   * Get user notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const result = await notificationService.getUserNotifications(
      userId,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          pages: result.pages,
        },
      },
    });
  });

  /**
   * Get unread notifications count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  });

  /**
   * Mark notification as read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await notificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  });

  /**
   * Mark all notifications as read
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  });

  /**
   * Delete notification
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  });
}

export default new NotificationController();
