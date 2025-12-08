import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  profilePhoto?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailChangeToken?: string;
  emailChangeExpires?: Date;
  newEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      match: [/^[a-z0-9._]+$/, 'Username can only contain lowercase letters, numbers, dots, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name must not exceed 100 characters'],
    },
    bio: {
      type: String,
      maxlength: [150, 'Bio must not exceed 150 characters'],
      default: '',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailChangeToken: {
      type: String,
      select: false,
    },
    emailChangeExpires: {
      type: Date,
      select: false,
    },
    newEmail: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for followers count
userSchema.virtual('followersCount', {
  ref: 'Follower',
  localField: '_id',
  foreignField: 'following',
  count: true,
});

// Virtual for following count
userSchema.virtual('followingCount', {
  ref: 'Follower',
  localField: '_id',
  foreignField: 'follower',
  count: true,
});

// Virtual for posts count
userSchema.virtual('postsCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
  count: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
