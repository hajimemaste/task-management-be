import { Document, ObjectId } from "mongoose";
import { IFirebaseUpload } from "./firebase.interface";

export type AuthProvider = "local" | "google";
export type AccountStatus = "pending" | "approved" | "rejected";
export type UserRole = "user" | "admin";

export interface IUser extends Document {
  _id: ObjectId;
  email: string;
  password?: string;

  provider: AuthProvider;

  isEmailVerified: boolean;
  status: AccountStatus;

  otp?: string;
  otpExpiredAt?: Date;

  resetPasswordOtp?: string;
  resetPasswordOtpExpiredAt?: Date;

  // Thông tin cơ bản
  name?: string;
  avatar?: IFirebaseUpload;
  role: UserRole;

  approvedBy?: string;
  approvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
