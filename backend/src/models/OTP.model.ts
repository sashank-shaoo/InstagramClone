import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type OTPType = 'email_verification' | 'password_reset' | 'email_change';

export interface IOTP extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  type: OTPType;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  compareOTP(candidateOTP: string): Promise<boolean>;
}

const otpSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset', 'email_change'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
otpSchema.index({ email: 1, type: 1, isUsed: 1 });

// TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 }); // 10 minutes grace period

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otpHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.otpHash = await bcrypt.hash(this.otpHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare OTP
otpSchema.methods.compareOTP = async function (candidateOTP: string): Promise<boolean> {
  return await bcrypt.compare(candidateOTP, this.otpHash);
};

const OTP: Model<IOTP> = mongoose.model<IOTP>('OTP', otpSchema);

export default OTP;
