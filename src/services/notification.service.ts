import admin from "firebase-admin";
import { Notification } from "../models/notification.model";
import { User } from "../models/user.model";
import { NotificationType } from "interfaces/notification.interface";

// =======================
// TYPES
// =======================

interface SendNotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>; // FCM yêu cầu string
}

interface SendNotificationToManyPayload {
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}

// =======================
// UTILS
// =======================

const chunkArray = (arr: string[], size = 500) => {
  const result: string[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const removeInvalidTokens = async (tokens: string[]) => {
  if (!tokens.length) return;

  await User.updateMany(
    { fcmTokens: { $in: tokens } },
    { $pull: { fcmTokens: { $in: tokens } } },
  );
};

// =======================
// CORE PUSH
// =======================

const sendPushToTokens = async ({
  tokens,
  title,
  body,
  data,
}: {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}) => {
  if (!tokens.length) return;

  const batches = chunkArray(tokens, 500);

  for (const batch of batches) {
    const res = await admin.messaging().sendMulticast({
      tokens: batch,
      notification: {
        title,
        body,
      },
      data,
    });

    const invalidTokens: string[] = [];

    res.responses.forEach((r, idx) => {
      if (!r.success) {
        invalidTokens.push(batch[idx]);
      }
    });

    await removeInvalidTokens(invalidTokens);
  }
};

// =======================
// SERVICES
// =======================

// 🔹 Gửi 1 user
export const sendNotification = async ({
  userId,
  title,
  body,
  type,
  data = {},
}: SendNotificationPayload) => {
  const user = await User.findById(userId);
  if (!user) return;

  // lưu DB
  await Notification.create({
    userId,
    title,
    body,
    type,
    data,
  });

  await sendPushToTokens({
    tokens: user.fcmTokens || [],
    title,
    body,
    data: {
      ...data,
      type,
    },
  });
};

// 🔹 Gửi nhiều user
export const sendNotificationToMany = async ({
  userIds,
  title,
  body,
  type,
  data = {},
}: SendNotificationToManyPayload) => {
  const users = await User.find({ _id: { $in: userIds } });
  if (!users.length) return;

  // lưu DB bulk
  await Notification.insertMany(
    users.map((u) => ({
      userId: u._id,
      title,
      body,
      type,
      data,
    })),
  );

  const tokens = users.flatMap((u) => u.fcmTokens || []);

  await sendPushToTokens({
    tokens,
    title,
    body,
    data: {
      ...data,
      type,
    },
  });
};

// 🔹 Lấy danh sách notification
export const getNotificationsByUser = async (userId: string) => {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
};

// 🔹 Mark read
export const markNotificationAsRead = async (id: string) => {
  return Notification.findByIdAndUpdate(id, { isRead: true });
};

// 🔹 Count unread
export const countUnreadNotifications = async (userId: string) => {
  return Notification.countDocuments({
    userId,
    isRead: false,
  });
};
