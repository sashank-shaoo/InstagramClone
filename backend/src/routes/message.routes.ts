import { Router } from "express";
import messageController from "@controllers/message.controller";
import { authenticate } from "@middleware/auth.middleware";

const router = Router();

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations for authenticated user
 * @access  Private
 */
router.get("/conversations", authenticate, messageController.getConversations);

/**
 * @route   POST /api/messages/conversations/:userId
 * @desc    Get or create a conversation with another user
 * @access  Private
 */
router.post(
  "/conversations/:userId",
  authenticate,
  messageController.getOrCreateConversation
);

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get("/:conversationId", authenticate, messageController.getMessages);

/**
 * @route   POST /api/messages/:conversationId
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post("/:conversationId", authenticate, messageController.sendMessage);

/**
 * @route   PUT /api/messages/:conversationId/read
 * @desc    Mark messages as read in a conversation
 * @access  Private
 */
router.put("/:conversationId/read", authenticate, messageController.markAsRead);

export default router;
