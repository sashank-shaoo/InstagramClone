import { Request, Response } from "express";
import Comment, { IComment } from "@models/Comment.model";
import Post from "@models/Post.model";
import Like from "@models/Like.model";
import notificationService from "@services/notification.service";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";

class CommentController {
  /**
   * Create a new comment on a post
   */
  createComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;
      const { text, parentCommentId } = req.body;

      if (!text || !text.trim()) {
        throw new ValidationError("Comment text is required");
      }

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post || !post.isVisible) {
        throw new NotFoundError("Post not found");
      }

      // If replying to a comment, verify parent comment exists
      let parentComment = null;
      if (parentCommentId) {
        parentComment = await Comment.findById(parentCommentId);
        if (!parentComment || parentComment.post.toString() !== postId) {
          throw new NotFoundError("Parent comment not found");
        }
      }

      // Create the comment
      const comment = await Comment.create({
        post: postId,
        user: userId,
        text: text.trim(),
        parentComment: parentCommentId || null,
      });

      // Update counts
      post.commentsCount += 1;
      await post.save();

      if (parentComment) {
        parentComment.repliesCount += 1;
        await parentComment.save();
      }

      // Populate user data
      await comment.populate("user", "username fullName profilePhoto");

      // Send notification
      const notifyUserId = parentComment
        ? parentComment.user.toString()
        : post.user.toString();

      if (notifyUserId !== userId) {
        await notificationService.createNotification(
          notifyUserId,
          userId,
          "comment",
          parentComment ? "replied to your comment" : "commented on your post",
          "post",
          postId
        );
      }

      logger.info(`Comment created on post ${postId} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: {
          comment: {
            id: comment._id,
            user: comment.user,
            text: comment.text,
            parentComment: comment.parentComment,
            likesCount: comment.likesCount,
            repliesCount: comment.repliesCount,
            createdAt: comment.createdAt,
          },
        },
      });
    }
  );

  /**
   * Get comments for a post
   */
  getComments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { postId } = req.params;
      const { page = 1, limit = 20, parentCommentId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post || !post.isVisible) {
        throw new NotFoundError("Post not found");
      }

      // Build query - get top-level comments or replies
      const query: Record<string, unknown> = {
        post: postId,
        parentComment: parentCommentId || null,
      };

      const [comments, total] = await Promise.all([
        Comment.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("user", "username fullName profilePhoto")
          .lean(),
        Comment.countDocuments(query),
      ]);

      // Get like status for each comment if user is authenticated
      let likedCommentIds = new Set<string>();
      if (userId) {
        const commentIds = comments.map((c) => c._id);
        const userLikes = await Like.find({
          user: userId,
          targetType: "comment",
          target: { $in: commentIds },
        }).select("target");
        likedCommentIds = new Set(
          userLikes.map((like) => like.target.toString())
        );
      }

      const commentsWithStatus = comments.map((comment) => ({
        id: comment._id,
        user: comment.user,
        text: comment.text,
        parentComment: comment.parentComment,
        likesCount: comment.likesCount,
        repliesCount: comment.repliesCount,
        isLiked: userId ? likedCommentIds.has(comment._id.toString()) : false,
        createdAt: comment.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          comments: commentsWithStatus,
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
   * Delete a comment
   */
  deleteComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new NotFoundError("Comment not found");
      }

      if (comment.user.toString() !== userId) {
        throw new ForbiddenError("You can only delete your own comments");
      }

      const postId = comment.post;
      const parentCommentId = comment.parentComment;

      // Delete comment and its likes
      await Promise.all([
        comment.deleteOne(),
        Like.deleteMany({ targetType: "comment", target: commentId }),
      ]);

      // If this comment has replies, delete them too
      const replies = await Comment.find({ parentComment: commentId });
      if (replies.length > 0) {
        const replyIds = replies.map((r) => r._id);
        await Promise.all([
          Comment.deleteMany({ parentComment: commentId }),
          Like.deleteMany({ targetType: "comment", target: { $in: replyIds } }),
        ]);
      }

      // Update post comment count
      const post = await Post.findById(postId);
      if (post) {
        post.commentsCount = Math.max(
          0,
          post.commentsCount - 1 - replies.length
        );
        await post.save();
      }

      // Update parent comment reply count
      if (parentCommentId) {
        const parentComment = await Comment.findById(parentCommentId);
        if (parentComment) {
          parentComment.repliesCount = Math.max(
            0,
            parentComment.repliesCount - 1
          );
          await parentComment.save();
        }
      }

      logger.info(`Comment deleted: ${commentId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    }
  );

  /**
   * Like a comment
   */
  likeComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new NotFoundError("Comment not found");
      }

      // Check if already liked
      const existingLike = await Like.findOne({
        user: userId,
        targetType: "comment",
        target: commentId,
      });

      if (existingLike) {
        throw new ValidationError("Comment already liked");
      }

      // Create like
      await Like.create({
        user: userId,
        targetType: "comment",
        target: commentId,
      });

      // Increment likes count
      comment.likesCount += 1;
      await comment.save();

      // Send notification
      if (comment.user.toString() !== userId) {
        await notificationService.createNotification(
          comment.user.toString(),
          userId,
          "like",
          "liked your comment",
          "comment",
          commentId
        );
      }

      logger.info(`Comment liked: ${commentId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Comment liked",
        data: {
          likesCount: comment.likesCount,
        },
      });
    }
  );

  /**
   * Unlike a comment
   */
  unlikeComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new NotFoundError("Comment not found");
      }

      const like = await Like.findOneAndDelete({
        user: userId,
        targetType: "comment",
        target: commentId,
      });

      if (!like) {
        throw new ValidationError("Comment not liked");
      }

      // Decrement likes count
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();

      logger.info(`Comment unliked: ${commentId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Comment unliked",
        data: {
          likesCount: comment.likesCount,
        },
      });
    }
  );
}

export default new CommentController();
