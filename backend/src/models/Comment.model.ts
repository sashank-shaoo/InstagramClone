import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  parentComment?: mongoose.Types.ObjectId;
  likesCount: number;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [500, 'Comment must not exceed 500 characters'],
      trim: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });

const Comment: Model<IComment> = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
