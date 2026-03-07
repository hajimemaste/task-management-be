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

    firebaseUid: {
      type: String,
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

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    name: {
      type: String,
      trim: true,
      required: true,
    },

    avatar: {
      type: FirebaseUploadSchema,
    },

    gender: {
      type: Number,
    },

    dateOfBirth: {
      type: Date,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    rank: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    otp: {
      type: String,
    },

    otpExpiredAt: {
      type: Date,
    },

    resetPasswordOtp: {
      type: String,
    },

    resetPasswordOtpExpiredAt: {
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
