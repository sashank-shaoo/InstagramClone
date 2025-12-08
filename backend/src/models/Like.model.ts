import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILike extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  targetType: 'post' | 'comment';
  target: mongoose.Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment'],
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index to prevent duplicate likes
likeSchema.index({ user: 1, target: 1, targetType: 1 }, { unique: true });

// Indexes for performance
likeSchema.index({ target: 1, targetType: 1, createdAt: -1 });
likeSchema.index({ user: 1, createdAt: -1 });

const Like: Model<ILike> = mongoose.model<ILike>('Like', likeSchema);

export default Like;
