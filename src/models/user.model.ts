import mongoose, { Schema } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { FirebaseUploadSchema } from "./firebase.model";

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
    },

    name: {
      type: String,
      trim: true,
    },

    avatar: {
      type: FirebaseUploadSchema,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordOtp: { type: String },
    resetPasswordOtpExpiredAt: { type: Date },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    otp: {
      type: String,
    },

    otpExpiredAt: {
      type: Date,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>("User", userSchema);
