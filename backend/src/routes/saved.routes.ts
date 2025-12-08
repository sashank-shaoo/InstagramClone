import { Router } from "express";
import savedController from "@controllers/saved.controller";
import { authenticate } from "@middleware/auth.middleware";

const router = Router();

/**
 * @route   GET /api/saved
 * @desc    Get saved posts for authenticated user
 * @access  Private
 */
router.get("/", authenticate, savedController.getSavedPosts);

/**
 * @route   POST /api/saved/:postId
 * @desc    Save a post
 * @access  Private
 */
router.post("/:postId", authenticate, savedController.savePost);

/**
 * @route   DELETE /api/saved/:postId
 * @desc    Unsave a post
 * @access  Private
 */
router.delete("/:postId", authenticate, savedController.unsavePost);

/**
 * @route   GET /api/saved/:postId/check
 * @desc    Check if a post is saved
 * @access  Private
 */
router.get("/:postId/check", authenticate, savedController.checkSaved);

export default router;
