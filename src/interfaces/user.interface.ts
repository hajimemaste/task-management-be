import { Document, ObjectId } from "mongoose";
import { IFirebaseUpload } from "./firebase.interface";

export type AuthProvider = "local" | "google";
export type AccountStatus = "pending" | "approved" | "rejected";
export type UserRole = "user" | "admin";

export interface IUser extends Document {
  email: string;
  password?: string;

  provider: AuthProvider;
  firebaseUid?: string;

  isEmailVerified: boolean;
  status: AccountStatus;

  otp?: string;
  otpExpiredAt?: Date;

  resetPasswordOtp?: string;
  resetPasswordOtpExpiredAt?: Date;

  // Thông tin cơ bản
  name: string;
  avatar?: IFirebaseUpload;
  gender?: number;
  dateOfBirth?: Date;
  phoneNumber?: string;
  position?: string;
  rank?: string;

  role: UserRole;

  approvedBy?: string;
  approvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUpdateProfile {
  name?: string;
  avatar?: IFirebaseUpload;
  gender?: number;
  dateOfBirth?: Date;
  phoneNumber?: string;
  position?: string;
  rank?: string;
}
