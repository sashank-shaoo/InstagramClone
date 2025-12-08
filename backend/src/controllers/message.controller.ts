import { Request, Response } from "express";
import Conversation from "@models/Conversation.model";
import Message from "@models/Message.model";
import User from "@models/User.model";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";
import socketService from "@services/socket/socket.service";

class MessageController {
  /**
   * Get all conversations for the authenticated user
   */
  getConversations = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [conversations, total] = await Promise.all([
        Conversation.find({ participants: userId })
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("participants", "username fullName profilePhoto")
          .populate({
            path: "lastMessage",
            select: "text sender createdAt readBy",
          })
          .lean(),
        Conversation.countDocuments({ participants: userId }),
      ]);

      // Format conversations with unread count and other user info
      const formattedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Get the other participant
          const otherParticipant = (conv.participants as any[]).find(
            (p) => p._id.toString() !== userId
          );

          // Count unread messages
          const unreadCount = await Message.countDocuments({
            conversation: conv._id,
            readBy: { $ne: userId },
            sender: { $ne: userId },
          });

          return {
            id: conv._id,
            user: otherParticipant,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
            unreadCount,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          conversations: formattedConversations,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    }
  );

  /**
   * Get or create a conversation with another user
   */
  getOrCreateConversation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { userId: otherUserId } = req.params;

      if (userId === otherUserId) {
        throw new ValidationError("Cannot start conversation with yourself");
      }

      // Check if other user exists
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        throw new NotFoundError("User not found");
      }

      // Check if sender follows the recipient
      const { default: Follower } = await import("@models/Follower.model");
      const isFollowing = await Follower.findOne({
        follower: userId,
        following: otherUserId,
      });

      if (!isFollowing) {
        throw new ForbiddenError(
          "You must follow this user to send them a message"
        );
      }

      // Find existing conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [userId, otherUserId], $size: 2 },
      })
        .populate("participants", "username fullName profilePhoto")
        .populate({
          path: "lastMessage",
          select: "text sender createdAt",
        });

      // Create new conversation if doesn't exist
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [userId, otherUserId],
        });
        await conversation.populate(
          "participants",
          "username fullName profilePhoto"
        );
      }

      const otherParticipant = (conversation.participants as any[]).find(
        (p) => p._id.toString() !== userId
      );

      res.status(200).json({
        success: true,
        data: {
          conversation: {
            id: conversation._id,
            user: otherParticipant,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
          },
        },
      });
    }
  );

  /**
   * Get messages in a conversation
   */
  getMessages = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Check if user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) {
        throw new ForbiddenError(
          "You are not a participant in this conversation"
        );
      }

      const [messages, total] = await Promise.all([
        Message.find({ conversation: conversationId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("sender", "username fullName profilePhoto")
          .lean(),
        Message.countDocuments({ conversation: conversationId }),
      ]);

      const formattedMessages = messages.map((msg) => ({
        id: msg._id,
        sender: msg.sender,
        text: msg.text,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        isRead: msg.readBy.some((r) => r.toString() !== userId),
        isMine: (msg.sender as any)._id.toString() === userId,
        createdAt: msg.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          messages: formattedMessages.reverse(), // Return in chronological order
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    }
  );

  /**
   * Send a message in a conversation
   */
  sendMessage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { conversationId } = req.params;
      const { text, mediaUrl, mediaType } = req.body;

      if (!text && !mediaUrl) {
        throw new ValidationError("Message must have text or media");
      }

      // Check if user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) {
        throw new ForbiddenError(
          "You are not a participant in this conversation"
        );
      }

      // Create message
      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        text: text?.trim() || "",
        mediaUrl,
        mediaType,
        readBy: [userId], // Sender has read their own message
      });

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = message.createdAt;
      await conversation.save();

      // Populate sender info
      await message.populate("sender", "username fullName profilePhoto");

      // Get the other participant to send real-time notification
      const recipientId = conversation.participants.find(
        (p) => p.toString() !== userId
      );

      // Emit real-time message to recipient via Socket.io
      if (recipientId) {
        socketService.sendMessageToUser(recipientId.toString(), {
          conversationId,
          message: {
            id: message._id,
            sender: message.sender,
            text: message.text,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            isMine: false,
            createdAt: message.createdAt,
          },
        });
      }

      logger.info(
        `Message sent in conversation ${conversationId} by user ${userId}`
      );

      res.status(201).json({
        success: true,
        data: {
          message: {
            id: message._id,
            sender: message.sender,
            text: message.text,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            isMine: true,
            createdAt: message.createdAt,
          },
        },
      });
    }
  );

  /**
   * Mark messages as read in a conversation
   */
  markAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { conversationId } = req.params;

      // Check if user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) {
        throw new ForbiddenError(
          "You are not a participant in this conversation"
        );
      }

      // Mark all unread messages as read
      await Message.updateMany(
        {
          conversation: conversationId,
          readBy: { $ne: userId },
        },
        {
          $addToSet: { readBy: userId },
        }
      );

      logger.info(
        `Messages marked as read in conversation ${conversationId} by user ${userId}`
      );

      res.status(200).json({
        success: true,
        message: "Messages marked as read",
      });
    }
  );
}

export default new MessageController();
