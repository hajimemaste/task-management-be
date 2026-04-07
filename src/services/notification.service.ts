import admin from "firebase-admin";
import { Notification } from "../models/notification.model";
import { User } from "../models/user.model";
import { NotificationType } from "interfaces/notification.interface";
import { emitToUsers } from "../helpers/socket.helper";
import { Types } from "mongoose";
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
    try {
      const res = await admin.messaging().sendEachForMulticast({
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
          console.warn("❌ FCM lỗi:", r.error?.message);
          invalidTokens.push(batch[idx]);
        }
      });

      // 🔥 remove token lỗi
      if (invalidTokens.length) {
        await removeInvalidTokens(invalidTokens);
      }
    } catch (err: any) {
      // 💥 QUAN TRỌNG: KHÔNG throw
      console.error("❌ sendMulticast crash:", err?.message);

      // 👉 fallback: gửi từng token để không mất hết
      for (const token of batch) {
        try {
          await admin.messaging().send({
            token,
            notification: { title, body },
            data,
          });
        } catch (e: any) {
          console.warn("❌ token fail:", token);
          await removeInvalidTokens([token]);
        }
      }
    }
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
  // =======================
  // 🔥 0. LẤY ADMIN
  // =======================
  const admins = await User.find({ role: "ADMIN" }).select("_id");

  const adminIds = admins.map((a) => a._id.toString());

  // 👉 merge + remove duplicate
  const finalUserIds = Array.from(
    new Set([...userIds.map(String), ...adminIds]),
  );

  const users = await User.find({ _id: { $in: finalUserIds } });
  if (!users.length) return;

  // =======================
  // 🔹 1. LƯU DB
  // =======================
  const notifications = await Notification.insertMany(
    users.map((u) => ({
      userId: u._id,
      title,
      body,
      type,
      data,
    })),
  );

  const userIdStrings = finalUserIds;

  // =======================
  // 🔥 2. REALTIME - LIST
  // =======================
  emitToUsers(userIdStrings, "notification:new", {
    notifications,
  });

  // =======================
  // 🔥 3. REALTIME - BADGE
  // =======================
  const unreadCounts = await Notification.aggregate([
    {
      $match: {
        userId: {
          $in: finalUserIds.map((id) => new Types.ObjectId(id)),
        },
        isRead: false,
      },
    },
    {
      $group: {
        _id: "$userId",
        count: { $sum: 1 },
      },
    },
  ]);

  unreadCounts.forEach((u) => {
    emitToUsers([u._id.toString()], "notification:unread", {
      count: u.count,
    });
  });

  // =======================
  // 🔹 4. FCM
  // =======================
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

export const getAllNotificationsForAdmin = async () => {
  return Notification.find().sort({ createdAt: -1 }).limit(100);
};
