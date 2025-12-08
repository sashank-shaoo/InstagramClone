import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  caption: string;
  hashtags: string[];
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  likesCount: number;
  commentsCount: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption must not exceed 2200 characters'],
      default: '',
    },
    hashtags: {
      type: [String],
      default: [],
      index: true,
    },
    location: {
      name: {
        type: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ likesCount: -1 });

const Post: Model<IPost> = mongoose.model<IPost>('Post', postSchema);

export default Post;
