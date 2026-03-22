import { User } from "../models/user.model";
import { IUpdateProfile } from "../interfaces/user.interface";
import { deleteFile } from "../utils/firebase.utils";

export const updateProfileService = async (
  userId: string,
  payload: IUpdateProfile,
) => {
  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw new Error("User not found");
  }

  // Nếu có update avatar
  if (
    payload.avatar &&
    existingUser.avatar?.public_id &&
    payload.avatar.public_id !== existingUser.avatar.public_id
  ) {
    await deleteFile(existingUser.avatar.public_id);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: payload,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select(
      "-password -otp -otpExpiredAt -resetPasswordOtp -resetPasswordOtpExpiredAt",
    )
    .lean();

  return user;
};

export const getProfileService = async (userId: string) => {
  const user = await User.findById(userId)
    .select(
      "-password -otp -otpExpiredAt -resetPasswordOtp -resetPasswordOtpExpiredAt",
    )
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const getActiveUsersService = async (currentUserId: string) => {
  const users = await User.find({
    status: "approved",
    role: { $ne: "admin" },
    _id: { $ne: currentUserId },
  })
    .select(
      "-password -otp -otpExpiredAt -resetPasswordOtp -resetPasswordOtpExpiredAt",
    )
    .sort({ createdAt: -1 })
    .lean();

  return users;
};

export const getUserProfileService = async (userId: string) => {
  const user = await User.findById(userId)
    .select(
      "name avatar gender dateOfBirth phoneNumber position rank createdAt",
    )
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const saveFCMTokenService = async (userId: string, token: string) => {
  if (!token) {
    throw new Error("FCM token is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  await User.updateMany({ fcmTokens: token }, { $pull: { fcmTokens: token } });

  // 🔥 add nếu chưa có (tránh duplicate)
  await User.findByIdAndUpdate(userId, {
    $addToSet: { fcmTokens: token },
  });

  return true;
};

export const removeFCMTokenService = async (userId: string, token: string) => {
  if (!token) return;

  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: token },
  });

  return true;
};
