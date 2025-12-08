import { Router } from 'express';
import notificationController from '@controllers/notification.controller';
import { authenticate } from '@middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
