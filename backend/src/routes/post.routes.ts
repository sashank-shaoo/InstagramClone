import { Router } from "express";
import postController from "@controllers/post.controller";
import {
  authenticate,
  optionalAuthenticate,
} from "@middleware/auth.middleware";
import { uploadImage, uploadVideo } from "@config/multer.config";

const router = Router();

/**
 * @route   POST /api/posts/image
 * @desc    Create a new post with image
 * @access  Private
 */
router.post(
  "/image",
  authenticate,
  uploadImage.single("media"),
  postController.createPostWithImage
);

/**
 * @route   POST /api/posts/video
 * @desc    Create a new post with video
 * @access  Private
 */
router.post(
  "/video",
  authenticate,
  uploadVideo.single("media"),
  postController.createPostWithVideo
);

/**
 * @route   GET /api/posts/feed
 * @desc    Get home feed posts
 * @access  Private
 */
router.get("/feed", authenticate, postController.getFeed);

/**
 * @route   GET /api/posts/explore
 * @desc    Get explore page - all image posts from all users
 * @access  Public (with optional auth for like status)
 */
router.get("/explore", optionalAuthenticate, postController.getExplore);

/**
 * @route   GET /api/posts/user/:username
 * @desc    Get posts by username
 * @access  Public
 */
router.get("/user/:username", postController.getUserPosts);

/**
 * @route   GET /api/posts/:postId
 * @desc    Get single post
 * @access  Public (with optional auth for like status)
 */
router.get("/:postId", optionalAuthenticate, postController.getPost);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Update post caption/location
 * @access  Private
 */
router.put("/:postId", authenticate, postController.updatePost);

/**
 * @route   DELETE /api/posts/:postId
 * @desc    Delete a post
 * @access  Private
 */
router.delete("/:postId", authenticate, postController.deletePost);

/**
 * @route   POST /api/posts/:postId/like
 * @desc    Like a post
 * @access  Private
 */
router.post("/:postId/like", authenticate, postController.likePost);

/**
 * @route   DELETE /api/posts/:postId/like
 * @desc    Unlike a post
 * @access  Private
 */
router.delete("/:postId/like", authenticate, postController.unlikePost);

export default router;
