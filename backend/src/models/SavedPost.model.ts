import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISavedPost extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  createdAt: Date;
}

const savedPostSchema = new Schema<ISavedPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index to prevent duplicate saves
savedPostSchema.index({ user: 1, post: 1 }, { unique: true });

// Index for fetching saved posts by user
savedPostSchema.index({ user: 1, createdAt: -1 });

const SavedPost: Model<ISavedPost> = mongoose.model<ISavedPost>(
  "SavedPost",
  savedPostSchema
);

export default SavedPost;
