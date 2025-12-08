import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'reply';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: NotificationType;
  targetType?: 'post' | 'comment';
  target?: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'mention', 'reply'],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment'],
    },
    target: {
      type: Schema.Types.ObjectId,
      refPath: 'targetType',
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL index to auto-delete old read notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { isRead: true },
  }
);

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
