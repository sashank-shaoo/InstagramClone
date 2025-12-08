import { Router } from "express";
import userController from "@controllers/user.controller";
import {
  authenticate,
  optionalAuthenticate,
} from "@middleware/auth.middleware";
import {
  validate,
  updateProfileSchema,
} from "@middleware/validation.middleware";
import { uploadProfilePhoto } from "@config/multer.config";

const router = Router();

// Public routes (can be accessed with or without authentication)
router.get("/search", optionalAuthenticate, userController.searchUsers);

// Protected routes - must come before /:username to avoid conflicts
router.get("/suggestions/users", authenticate, userController.getSuggestions);
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile
);
router.post(
  "/profile/photo",
  authenticate,
  uploadProfilePhoto.single("photo"),
  userController.uploadProfilePhoto
);
router.delete(
  "/profile/photo",
  authenticate,
  userController.deleteProfilePhoto
);

// Get following users with online status
router.get(
  "/following/status",
  authenticate,
  userController.getFollowingWithStatus
);
// Follow routes - must come before /:username
router.post("/:username/follow", authenticate, userController.followUser);
router.delete("/:username/follow", authenticate, userController.unfollowUser);

// Get user profile (must be last due to :username param)
router.get("/:username", optionalAuthenticate, userController.getProfile);

export default router;
