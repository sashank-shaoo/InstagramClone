import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      maxlength: [2000, "Message must not exceed 2000 characters"],
      default: "",
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for fetching messages in a conversation
messageSchema.index({ conversation: 1, createdAt: -1 });

// Index for unread messages
messageSchema.index({ conversation: 1, readBy: 1 });

const Message: Model<IMessage> = mongoose.model<IMessage>(
  "Message",
  messageSchema
);

export default Message;
