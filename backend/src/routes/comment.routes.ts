import { Router } from "express";
import commentController from "@controllers/comment.controller";
import {
  authenticate,
  optionalAuthenticate,
} from "@middleware/auth.middleware";

const router = Router();

/**
 * @route   POST /api/comments/:postId
 * @desc    Create a new comment on a post
 * @access  Private
 */
router.post("/:postId", authenticate, commentController.createComment);

/**
 * @route   GET /api/comments/:postId
 * @desc    Get comments for a post
 * @access  Public (with optional auth for like status)
 */
router.get("/:postId", optionalAuthenticate, commentController.getComments);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
router.delete("/:commentId", authenticate, commentController.deleteComment);

/**
 * @route   POST /api/comments/:commentId/like
 * @desc    Like a comment
 * @access  Private
 */
router.post("/:commentId/like", authenticate, commentController.likeComment);

/**
 * @route   DELETE /api/comments/:commentId/like
 * @desc    Unlike a comment
 * @access  Private
 */
router.delete(
  "/:commentId/like",
  authenticate,
  commentController.unlikeComment
);

export default router;
