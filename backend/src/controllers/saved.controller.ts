import { Request, Response } from "express";
import SavedPost from "@models/SavedPost.model";
import Post from "@models/Post.model";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";

class SavedController {
  /**
   * Save a post
   */
  savePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post || !post.isVisible) {
        throw new NotFoundError("Post not found");
      }

      // Check if already saved
      const existingSave = await SavedPost.findOne({
        user: userId,
        post: postId,
      });

      if (existingSave) {
        throw new ValidationError("Post already saved");
      }

      // Create saved post
      await SavedPost.create({
        user: userId,
        post: postId,
      });

      logger.info(`Post saved: ${postId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Post saved",
      });
    }
  );

  /**
   * Unsave a post
   */
  unsavePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      const savedPost = await SavedPost.findOneAndDelete({
        user: userId,
        post: postId,
      });

      if (!savedPost) {
        throw new ValidationError("Post not saved");
      }

      logger.info(`Post unsaved: ${postId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Post unsaved",
      });
    }
  );

  /**
   * Get saved posts for the authenticated user
   */
  getSavedPosts = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [savedPosts, total] = await Promise.all([
        SavedPost.find({ user: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate({
            path: "post",
            select:
              "mediaUrl thumbnailUrl mediaType likesCount commentsCount caption user",
            populate: {
              path: "user",
              select: "username fullName profilePhoto",
            },
          })
          .lean(),
        SavedPost.countDocuments({ user: userId }),
      ]);

      // Filter out any saved posts where the post was deleted
      const validSavedPosts = savedPosts.filter((sp) => sp.post);

      const posts = validSavedPosts.map((sp) => {
        const post = sp.post as any;
        return {
          id: post._id,
          mediaUrl: post.mediaUrl,
          thumbnailUrl: post.thumbnailUrl,
          mediaType: post.mediaType,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          caption: post.caption,
          user: post.user,
          savedAt: sp.createdAt,
          isSaved: true,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          posts,
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
   * Check if a post is saved
   */
  checkSaved = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      const savedPost = await SavedPost.findOne({
        user: userId,
        post: postId,
      });

      res.status(200).json({
        success: true,
        data: {
          isSaved: !!savedPost,
        },
      });
    }
  );
}

export default new SavedController();
