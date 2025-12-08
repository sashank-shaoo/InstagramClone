import { Request, Response } from "express";
import Post, { IPost } from "@models/Post.model";
import User from "@models/User.model";
import Like from "@models/Like.model";
import SavedPost from "@models/SavedPost.model";
import Comment from "@models/Comment.model";
import cloudinaryService from "@services/upload/cloudinary.service";
import notificationService from "@services/notification.service";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";

class PostController {
  /**
   * Create a new post with image
   */
  createPostWithImage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { caption, location } = req.body;

      if (!req.file) {
        throw new ValidationError("No image file uploaded");
      }

      // Upload image to Cloudinary
      const uploadResult = await cloudinaryService.uploadImage(
        req.file.buffer,
        "instagram/posts"
      );

      // Extract hashtags from caption
      const hashtags = this.extractHashtags(caption || "");

      // Parse location if provided
      let parsedLocation;
      if (location) {
        try {
          parsedLocation =
            typeof location === "string" ? JSON.parse(location) : location;
        } catch {
          parsedLocation = { name: location };
        }
      }

      // Create post
      const post = await Post.create({
        user: userId,
        mediaType: "image",
        mediaUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        caption: caption || "",
        hashtags,
        location: parsedLocation,
      });

      // Populate user data
      await post.populate("user", "username fullName profilePhoto");

      logger.info(`Post created by user ${userId}: ${post._id}`);

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: {
          post: {
            id: post._id,
            user: post.user,
            mediaType: post.mediaType,
            mediaUrl: post.mediaUrl,
            thumbnailUrl: post.thumbnailUrl,
            width: post.width,
            height: post.height,
            caption: post.caption,
            hashtags: post.hashtags,
            location: post.location,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdAt: post.createdAt,
          },
        },
      });
    }
  );

  /**
   * Create a new post with video
   */
  createPostWithVideo = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { caption, location } = req.body;

      if (!req.file) {
        throw new ValidationError("No video file uploaded");
      }

      // Upload video to Cloudinary
      let uploadResult;
      try {
        uploadResult = await cloudinaryService.uploadVideo(
          req.file.buffer,
          "instagram/posts"
        );
      } catch (uploadError: any) {
        logger.error(`Video upload failed: ${uploadError.message}`);
        throw new ValidationError(
          "Video upload failed. Please try again with a smaller file."
        );
      }

      // Validate upload result - ensure we have a valid URL
      if (!uploadResult || !uploadResult.url) {
        logger.error("Video upload returned empty result");
        throw new ValidationError("Video upload failed. Please try again.");
      }

      // Extract hashtags from caption
      const hashtags = this.extractHashtags(caption || "");

      // Parse location if provided
      let parsedLocation;
      if (location) {
        try {
          parsedLocation =
            typeof location === "string" ? JSON.parse(location) : location;
        } catch {
          parsedLocation = { name: location };
        }
      }

      // Create post only after successful upload
      const post = await Post.create({
        user: userId,
        mediaType: "video",
        mediaUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        caption: caption || "",
        hashtags,
        location: parsedLocation,
      });

      // Populate user data
      await post.populate("user", "username fullName profilePhoto");

      logger.info(`Video post created by user ${userId}: ${post._id}`);

      res.status(201).json({
        success: true,
        message: "Video post created successfully",
        data: {
          post: {
            id: post._id,
            user: post.user,
            mediaType: post.mediaType,
            mediaUrl: post.mediaUrl,
            thumbnailUrl: post.thumbnailUrl,
            width: post.width,
            height: post.height,
            caption: post.caption,
            hashtags: post.hashtags,
            location: post.location,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdAt: post.createdAt,
          },
        },
      });
    }
  );

  /**
   * Get home feed posts
   */
  getFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get posts from users the current user follows + own posts
    const { default: Follower } = await import("@models/Follower.model");
    const following = await Follower.find({ follower: userId }).select(
      "following"
    );
    const followingIds = following.map((f) => f.following);

    const posts = await Post.find({
      user: { $in: [...followingIds, userId] },
      isVisible: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("user", "username fullName profilePhoto")
      .lean();

    // Get like status and saved status for each post
    const postIds = posts.map((post) => post._id);

    const [userLikes, userSaved] = await Promise.all([
      Like.find({
        user: userId,
        targetType: "post",
        target: { $in: postIds },
      }).select("target"),
      SavedPost.find({
        user: userId,
        post: { $in: postIds },
      }).select("post"),
    ]);

    const likedPostIds = new Set(
      userLikes.map((like) => like.target.toString())
    );
    const savedPostIds = new Set(userSaved.map((save) => save.post.toString()));

    const postsWithStatus = posts.map((post) => {
      const postUser = post.user as any;
      const isOwnPost = postUser._id.toString() === userId;
      return {
        id: post._id,
        user: {
          id: postUser._id,
          username: postUser.username,
          fullName: postUser.fullName,
          profilePhoto: postUser.profilePhoto,
          isFollowing: !isOwnPost, // true for followed users, false for own posts
        },
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        hashtags: post.hashtags,
        location: post.location,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isLiked: likedPostIds.has(post._id.toString()),
        isSaved: savedPostIds.has(post._id.toString()),
        createdAt: post.createdAt,
      };
    });

    const total = await Post.countDocuments({
      user: { $in: [...followingIds, userId] },
      isVisible: true,
    });

    res.status(200).json({
      success: true,
      data: {
        posts: postsWithStatus,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  /**
   * Get explore page - posts from users the current user is NOT following
   */
  getExplore = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { page = 1, limit = 30 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Get list of users the current user follows (to exclude them)
      let excludedUserIds: string[] = [];
      if (userId) {
        const { default: Follower } = await import("@models/Follower.model");
        const following = await Follower.find({ follower: userId }).select(
          "following"
        );
        excludedUserIds = following.map((f) => f.following.toString());
        // Also exclude the current user's own posts
        excludedUserIds.push(userId);
      }

      // Get all posts from users NOT being followed (both images and videos)
      const posts = await Post.find({
        isVisible: true,
        ...(userId && excludedUserIds.length > 0
          ? { user: { $nin: excludedUserIds } }
          : {}),
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "username fullName profilePhoto")
        .lean();

      // Get like status and following status for each post if user is authenticated
      let likedPostIds = new Set<string>();
      let savedPostIds = new Set<string>();
      let followingUserIds = new Set<string>();

      if (userId) {
        const postIds = posts.map((post) => post._id);
        const userIds = posts.map((post) => (post.user as any)._id);

        // Get likes and saved posts
        const [userLikes, userSaved] = await Promise.all([
          Like.find({
            user: userId,
            targetType: "post",
            target: { $in: postIds },
          }).select("target"),
          SavedPost.find({
            user: userId,
            post: { $in: postIds },
          }).select("post"),
        ]);
        likedPostIds = new Set(userLikes.map((like) => like.target.toString()));
        savedPostIds = new Set(userSaved.map((save) => save.post.toString()));

        // Get following status
        const { default: Follower } = await import("@models/Follower.model");
        const following = await Follower.find({
          follower: userId,
          following: { $in: userIds },
        }).select("following");
        followingUserIds = new Set(
          following.map((f) => f.following.toString())
        );
      }

      const postsWithDetails = posts.map((post) => {
        const postUser = post.user as any;
        return {
          id: post._id,
          user: {
            id: postUser._id,
            username: postUser.username,
            fullName: postUser.fullName,
            profilePhoto: postUser.profilePhoto,
            isFollowing: userId
              ? followingUserIds.has(postUser._id.toString())
              : false,
          },
          mediaType: post.mediaType,
          mediaUrl: post.mediaUrl,
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption,
          hashtags: post.hashtags,
          location: post.location,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          isLiked: userId ? likedPostIds.has(post._id.toString()) : false,
          isSaved: userId ? savedPostIds.has(post._id.toString()) : false,
          createdAt: post.createdAt,
        };
      });

      const total = await Post.countDocuments({
        isVisible: true,
        ...(userId && excludedUserIds.length > 0
          ? { user: { $nin: excludedUserIds } }
          : {}),
      });

      res.status(200).json({
        success: true,
        data: {
          posts: postsWithDetails,
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
   * Get single post by ID
   */
  getPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { postId } = req.params;
    const userId = req.user?.id;

    const post = await Post.findById(postId)
      .populate("user", "username fullName profilePhoto")
      .lean();

    if (!post || !post.isVisible) {
      throw new NotFoundError("Post not found");
    }

    // Check if user has liked the post
    let isLiked = false;
    if (userId) {
      const like = await Like.findOne({
        user: userId,
        targetType: "post",
        target: postId,
      });
      isLiked = !!like;
    }

    res.status(200).json({
      success: true,
      data: {
        post: {
          id: post._id,
          user: post.user,
          mediaType: post.mediaType,
          mediaUrl: post.mediaUrl,
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption,
          hashtags: post.hashtags,
          location: post.location,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          isLiked,
          createdAt: post.createdAt,
        },
      },
    });
  });

  /**
   * Get posts by user
   */
  getUserPosts = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const { page = 1, limit = 12 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const user = await User.findOne({ username });
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const [posts, total] = await Promise.all([
        Post.find({ user: user._id, isVisible: true })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .select("mediaUrl thumbnailUrl mediaType likesCount commentsCount")
          .lean(),
        Post.countDocuments({ user: user._id, isVisible: true }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          posts: posts.map((post) => ({
            id: post._id,
            mediaUrl: post.mediaUrl,
            thumbnailUrl: post.thumbnailUrl,
            mediaType: post.mediaType,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
          })),
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
   * Update post caption
   */
  updatePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;
      const { caption, location } = req.body;

      const post = await Post.findById(postId);

      if (!post) {
        throw new NotFoundError("Post not found");
      }

      if (post.user.toString() !== userId) {
        throw new ForbiddenError("You can only edit your own posts");
      }

      if (caption !== undefined) {
        post.caption = caption;
        post.hashtags = this.extractHashtags(caption);
      }

      if (location !== undefined) {
        try {
          post.location =
            typeof location === "string" ? JSON.parse(location) : location;
        } catch {
          post.location = { name: location };
        }
      }

      await post.save();

      logger.info(`Post updated: ${postId}`);

      res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: {
          post: {
            id: post._id,
            caption: post.caption,
            hashtags: post.hashtags,
            location: post.location,
          },
        },
      });
    }
  );

  /**
   * Delete post
   */
  deletePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      const post = await Post.findById(postId);

      if (!post) {
        throw new NotFoundError("Post not found");
      }

      if (post.user.toString() !== userId) {
        throw new ForbiddenError("You can only delete your own posts");
      }

      // Delete media from Cloudinary
      try {
        const publicIdMatch = post.mediaUrl.match(/instagram\/posts\/([^.]+)/);
        if (publicIdMatch) {
          await cloudinaryService.deleteFile(
            `instagram/posts/${publicIdMatch[1]}`,
            post.mediaType
          );
        }
      } catch (error) {
        logger.warn(`Failed to delete post media from Cloudinary: ${error}`);
      }

      // Delete the post and related data
      await Promise.all([
        post.deleteOne(),
        Like.deleteMany({ targetType: "post", target: postId }),
        Comment.deleteMany({ post: postId }),
      ]);

      logger.info(`Post deleted: ${postId}`);

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    }
  );

  /**
   * Like a post
   */
  likePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      const post = await Post.findById(postId);

      if (!post || !post.isVisible) {
        throw new NotFoundError("Post not found");
      }

      // Check if already liked
      const existingLike = await Like.findOne({
        user: userId,
        targetType: "post",
        target: postId,
      });

      if (existingLike) {
        throw new ValidationError("Post already liked");
      }

      // Create like
      await Like.create({
        user: userId,
        targetType: "post",
        target: postId,
      });

      // Increment likes count
      post.likesCount += 1;
      await post.save();

      // Send notification (if not own post)
      if (post.user.toString() !== userId) {
        await notificationService.createNotification(
          post.user.toString(),
          userId,
          "like",
          "liked your post",
          "post",
          postId
        );
      }

      logger.info(`Post liked: ${postId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Post liked",
        data: {
          likesCount: post.likesCount,
        },
      });
    }
  );

  /**
   * Unlike a post
   */
  unlikePost = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { postId } = req.params;

      const post = await Post.findById(postId);

      if (!post) {
        throw new NotFoundError("Post not found");
      }

      const like = await Like.findOneAndDelete({
        user: userId,
        targetType: "post",
        target: postId,
      });

      if (!like) {
        throw new ValidationError("Post not liked");
      }

      // Decrement likes count
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();

      logger.info(`Post unliked: ${postId} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Post unliked",
        data: {
          likesCount: post.likesCount,
        },
      });
    }
  );

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
  }
}

export default new PostController();
