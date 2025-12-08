import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding conversations by participant
conversationSchema.index({ participants: 1 });

// Index for sorting by last message
conversationSchema.index({ lastMessageAt: -1 });

// Compound index for finding conversation between two users
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default Conversation;
