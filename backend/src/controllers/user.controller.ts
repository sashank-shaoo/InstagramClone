import { Request, Response } from "express";
import User from "@models/User.model";
import Post from "@models/Post.model";
import Follower from "@models/Follower.model";
import cloudinaryService from "@services/upload/cloudinary.service";
import {
  asyncHandler,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@middleware/error-handler.middleware";
import logger from "@utils/logger";

class UserController {
  /**
   * Get user profile by username
   */
  getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const currentUserId = req.user?.id;

      const user = await User.findOne({ username }).select(
        "-password -refreshTokenHash -refreshTokenExpiresAt"
      );

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Get counts
      const [postsCount, followersCount, followingCount] = await Promise.all([
        Post.countDocuments({ user: user._id }),
        Follower.countDocuments({ following: user._id }),
        Follower.countDocuments({ follower: user._id }),
      ]);

      // Check if current user follows this user
      let isFollowing = false;
      if (currentUserId) {
        const follow = await Follower.findOne({
          follower: currentUserId,
          following: user._id,
        });
        isFollowing = !!follow;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            bio: user.bio,
            profilePhoto: user.profilePhoto,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
            postsCount,
            followersCount,
            followingCount,
            isFollowing,
          },
        },
      });
    }
  );

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const { fullName, bio, username } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Check if username is being changed and if it's available
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          throw new ConflictError("Username already taken");
        }
        user.username = username;
      }

      if (fullName !== undefined) user.fullName = fullName;
      if (bio !== undefined) user.bio = bio;

      await user.save();

      logger.info(`Profile updated for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            bio: user.bio,
            profilePhoto: user.profilePhoto,
          },
        },
      });
    }
  );

  /**
   * Upload profile photo
   */
  uploadProfilePhoto = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;

      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Delete old profile photo if exists
      if (user.profilePhoto) {
        try {
          const publicIdMatch = user.profilePhoto.match(/\/([^\/]+)\.[^.]+$/);
          if (publicIdMatch) {
            const publicId = `instagram/profiles/${publicIdMatch[1]}`;
            await cloudinaryService.deleteFile(publicId, "image");
          }
        } catch (error) {
          logger.warn(`Failed to delete old profile photo: ${error}`);
        }
      }

      // Upload new profile photo
      const uploadResult = await cloudinaryService.uploadProfilePhoto(
        req.file.buffer
      );

      user.profilePhoto = uploadResult.url;
      await user.save();

      logger.info(`Profile photo updated for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: "Profile photo uploaded successfully",
        data: {
          profilePhoto: user.profilePhoto,
        },
      });
    }
  );

  /**
   * Delete profile photo
   */
  deleteProfilePhoto = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;

      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      if (!user.profilePhoto) {
        throw new ValidationError("No profile photo to delete");
      }

      // Delete from Cloudinary
      try {
        const publicIdMatch = user.profilePhoto.match(/\/([^\/]+)\.[^.]+$/);
        if (publicIdMatch) {
          const publicId = `instagram/profiles/${publicIdMatch[1]}`;
          await cloudinaryService.deleteFile(publicId, "image");
        }
      } catch (error) {
        logger.warn(`Failed to delete profile photo from Cloudinary: ${error}`);
      }

      user.profilePhoto = "";
      await user.save();

      logger.info(`Profile photo deleted for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: "Profile photo deleted successfully",
      });
    }
  );

  /**
   * Search users
   */
  searchUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== "string") {
        throw new ValidationError("Search query is required");
      }

      const searchQuery = q.trim();
      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        User.find({
          $or: [
            { username: { $regex: searchQuery, $options: "i" } },
            { fullName: { $regex: searchQuery, $options: "i" } },
          ],
          isActive: true,
        })
          .select("username fullName profilePhoto bio")
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        User.countDocuments({
          $or: [
            { username: { $regex: searchQuery, $options: "i" } },
            { fullName: { $regex: searchQuery, $options: "i" } },
          ],
          isActive: true,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
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
   * Get user suggestions (random users to follow)
   */
  getSuggestions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const limit = 10;

      // Get users that current user is already following
      const following = await Follower.find({ follower: userId }).select(
        "following"
      );
      const followingIds = following.map((f) => f.following);

      // Find users not followed by current user
      const suggestions = await User.aggregate([
        {
          $match: {
            _id: { $nin: [...followingIds, userId] },
            isActive: true,
          },
        },
        { $sample: { size: limit } },
        {
          $project: {
            username: 1,
            fullName: 1,
            profilePhoto: 1,
            bio: 1,
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          suggestions,
        },
      });
    }
  );

  /**
   * Follow a user by username
   */
  followUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const currentUserId = req.user!.id;
      const { username } = req.params;

      // Find the user to follow
      const userToFollow = await User.findOne({ username });

      if (!userToFollow) {
        throw new NotFoundError("User not found");
      }

      // Check if trying to follow self
      if (userToFollow._id.toString() === currentUserId) {
        throw new ValidationError("You cannot follow yourself");
      }

      // Check if already following
      const existingFollow = await Follower.findOne({
        follower: currentUserId,
        following: userToFollow._id,
      });

      if (existingFollow) {
        throw new ConflictError("You are already following this user");
      }

      // Create follow relationship
      await Follower.create({
        follower: currentUserId,
        following: userToFollow._id,
      });

      logger.info(`User ${currentUserId} followed ${username}`);

      res.status(200).json({
        success: true,
        message: `You are now following ${username}`,
      });
    }
  );

  /**
   * Unfollow a user by username
   */
  unfollowUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const currentUserId = req.user!.id;
      const { username } = req.params;

      // Find the user to unfollow
      const userToUnfollow = await User.findOne({ username });

      if (!userToUnfollow) {
        throw new NotFoundError("User not found");
      }

      // Delete follow relationship
      const result = await Follower.findOneAndDelete({
        follower: currentUserId,
        following: userToUnfollow._id,
      });

      if (!result) {
        throw new ValidationError("You are not following this user");
      }

      logger.info(`User ${currentUserId} unfollowed ${username}`);

      res.status(200).json({
        success: true,
        message: `You have unfollowed ${username}`,
      });
    }
  );

  /**
   * Get users that current user is following with online status
   */
  getFollowingWithStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const currentUserId = req.user!.id;

      // Get users the current user is following
      const following = await Follower.find({ follower: currentUserId })
        .populate("following", "username fullName profilePhoto")
        .lean();

      // Import socket service to check online status
      const socketService = (await import("@services/socket/socket.service"))
        .default;
      const onlineUserIds = socketService.getOnlineUserIds();
      const onlineUserIdSet = new Set(onlineUserIds);

      // Map to response with online status
      const users = following.map((f) => {
        const user = f.following as any;
        return {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          profilePhoto: user.profilePhoto,
          isOnline: onlineUserIdSet.has(user._id.toString()),
        };
      });

      // Sort by online status (online users first)
      users.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

      res.status(200).json({
        success: true,
        data: {
          users,
        },
      });
    }
  );
}

export default new UserController();
