import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFollower extends Document {
  _id: mongoose.Types.ObjectId;
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
}

const followerSchema = new Schema<IFollower>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index to prevent duplicate follows
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent self-follow
followerSchema.pre('save', function (next) {
  if (this.follower.equals(this.following)) {
    next(new Error('Users cannot follow themselves'));
  } else {
    next();
  }
});

const Follower: Model<IFollower> = mongoose.model<IFollower>('Follower', followerSchema);

export default Follower;
