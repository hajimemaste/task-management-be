import { User } from "../models/user.model";
import { IUpdateProfile } from "../interfaces/user.interface";
import { deleteFile } from "../utils/firebase.utils";
import { ProfessionalCase } from "../models/professionalCase.model";
import { Task } from "../models/task.model";
import { Types } from "mongoose";
import { Notification } from "../models/notification.model";

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

export const getActiveUsersService = async () => {
  const users = await User.find({
    status: "approved",
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

// Thông kê

export const getFullStatisticsAggregate = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // =====================
  // 🔴 TOTAL HS (ALL)
  // =====================
  const totalHsAgg = await ProfessionalCase.aggregate([
    { $unwind: "$mainContent" },

    {
      $match: {
        "mainContent.progress": {
          $in: ["DONE_HANDOVER", "DONE_CONTACTED", "DONE_NOT_CONTACTED"],
        },
      },
    },

    { $count: "totalHs" },
  ]);

  const totalHs = totalHsAgg[0]?.totalHs || 0;

  // =====================
  // 🔵 TOTAL TASK (ALL)
  // =====================
  const totalTask = await Task.countDocuments({
    status: "COMPLETED",
  });
  // =====================
  // 🔴 CASE STATS (THEO USER)
  // =====================
  const caseStats = await ProfessionalCase.aggregate([
    { $unwind: "$mainContent" },
    { $unwind: "$mainContent.officers" },

    {
      $group: {
        _id: "$mainContent.officers",
        thamGiaVuViec: { $sum: 1 },
        tongHoSo: { $sum: 1 },

        hoanThanhHoSo: {
          $sum: {
            $cond: [{ $ne: ["$mainContent.progress", "PENDING"] }, 1, 0],
          },
        },
      },
    },
  ]);

  // =====================
  // 🔴 CASE TRỄ (THEO USER)
  // =====================
  const lateCaseStats = await ProfessionalCase.aggregate([
    { $unwind: "$mainContent" },
    { $unwind: "$mainContent.officers" },

    {
      $match: {
        $or: [
          // 🔴 chưa hoàn thành nhưng quá hạn
          {
            "mainContent.progress": "PENDING",
            "mainContent.submissionDeadline": {
              $ne: null,
              $lt: today, // ✅ FIX
            },
          },

          // 🔴 hoàn thành nhưng trễ
          {
            "mainContent.completedAt": { $ne: null },
            "mainContent.submissionDeadline": { $ne: null },
            $expr: {
              $gt: [
                {
                  $dateTrunc: {
                    date: "$mainContent.completedAt",
                    unit: "day",
                    timezone: "Asia/Ho_Chi_Minh",
                  },
                },
                {
                  $dateTrunc: {
                    date: "$mainContent.submissionDeadline",
                    unit: "day",
                    timezone: "Asia/Ho_Chi_Minh",
                  },
                },
              ],
            },
          },
        ],
      },
    },

    {
      $group: {
        _id: "$mainContent.officers",
        lateCases: { $sum: 1 },
      },
    },
  ]);

  // =====================
  // 🔵 TASK STATS (THEO USER)
  // =====================

  const taskStats = await Task.aggregate([
    { $unwind: "$assignments" },

    {
      $group: {
        _id: "$assignments.userId",

        thamMuuVanBan: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0],
          },
        },

        treHan: {
          $sum: {
            $cond: [
              {
                $or: [
                  // 🔴 chưa hoàn thành nhưng quá hạn (theo ngày)
                  {
                    $and: [
                      { $ne: ["$status", "COMPLETED"] },
                      { $lt: ["$deadline", today] },
                    ],
                  },

                  // 🔴 đã hoàn thành nhưng trễ (so theo ngày)
                  {
                    $and: [
                      { $eq: ["$status", "COMPLETED"] },
                      { $ne: ["$completedAt", null] },
                      {
                        $gt: [
                          {
                            $dateTrunc: {
                              date: "$completedAt",
                              unit: "day",
                              timezone: "Asia/Ho_Chi_Minh",
                            },
                          },
                          {
                            $dateTrunc: {
                              date: "$deadline",
                              unit: "day",
                              timezone: "Asia/Ho_Chi_Minh",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // =====================
  // 🔗 MERGE
  // =====================
  const users = await User.find({}).select("_id name role avatar").lean();

  const caseMap = new Map(
    caseStats.filter((c) => c._id).map((c) => [c._id.toString(), c]),
  );

  const taskMap = new Map(
    taskStats.filter((t) => t._id).map((t) => [t._id.toString(), t]),
  );

  const lateCaseMap = new Map(
    lateCaseStats.filter((l) => l._id).map((l) => [l._id.toString(), l]),
  );

  const result = users.map((user) => {
    const id = user._id.toString();

    const caseData = caseMap.get(id) || {};
    const taskData = taskMap.get(id) || {};
    const lateCaseData = lateCaseMap.get(id) || {};

    return {
      userId: user._id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,

      tongQuan: {
        thamGiaVuViec: caseData.thamGiaVuViec || 0,
        tongHoSo: caseData.tongHoSo || 0,
        hoanThanhHoSo: caseData.hoanThanhHoSo || 0,

        // 🔥 GỘP 2 NGUỒN
        thamMuuVanBan: taskData.thamMuuVanBan || 0,

        treHan: (taskData.treHan || 0) + (lateCaseData.lateCases || 0),
      },
    };
  });

  return {
    totalHs,
    totalTask,
    result,
  };
};

export const getMyStatisticsAggregate = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const objectUserId = new Types.ObjectId(userId);

  // =====================
  // 🔴 CASE STATS (ONLY USER)
  // =====================
  const caseStatsAgg = await ProfessionalCase.aggregate([
    { $unwind: "$mainContent" },
    { $unwind: "$mainContent.officers" },

    {
      $match: {
        "mainContent.officers": objectUserId,
      },
    },

    {
      $group: {
        _id: "$mainContent.officers",

        thamGiaVuViec: { $sum: 1 },
        tongHoSo: { $sum: 1 },

        hoanThanhHoSo: {
          $sum: {
            $cond: [{ $ne: ["$mainContent.progress", "PENDING"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const caseData = caseStatsAgg[0] || {};

  // =====================
  // 🔵 TASK STATS (ONLY USER)
  // =====================
  const taskStatsAgg = await Task.aggregate([
    { $unwind: "$assignments" },

    {
      $match: {
        "assignments.userId": objectUserId,
      },
    },

    {
      $group: {
        _id: "$assignments.userId",

        thamMuuVanBan: {
          $sum: {
            $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0],
          },
        },

        treHan: {
          $sum: {
            $cond: [
              {
                $or: [
                  // 🔴 chưa hoàn thành nhưng quá hạn (theo ngày)
                  {
                    $and: [
                      { $ne: ["$status", "COMPLETED"] },
                      { $lt: ["$deadline", today] },
                    ],
                  },

                  // 🔴 đã hoàn thành nhưng trễ (so theo ngày)
                  {
                    $and: [
                      { $eq: ["$status", "COMPLETED"] },
                      { $ne: ["$completedAt", null] },
                      {
                        $gt: [
                          {
                            $dateTrunc: {
                              date: "$completedAt",
                              unit: "day",
                              timezone: "Asia/Ho_Chi_Minh",
                            },
                          },
                          {
                            $dateTrunc: {
                              date: "$deadline",
                              unit: "day",
                              timezone: "Asia/Ho_Chi_Minh",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const taskData = taskStatsAgg[0] || {};

  // =====================
  // 🔴 CASE TRỄ (CHO thamMuuVanBan)
  // =====================
  const lateCaseAgg = await ProfessionalCase.aggregate([
    { $unwind: "$mainContent" },
    { $unwind: "$mainContent.officers" },

    {
      $match: {
        "mainContent.officers": objectUserId,
        $or: [
          // 🔴 chưa hoàn thành nhưng quá hạn
          {
            "mainContent.progress": "PENDING",
            "mainContent.submissionDeadline": {
              $ne: null,
              $lt: today, // ✅ FIX
            },
          },

          // 🔴 hoàn thành nhưng trễ
          {
            "mainContent.completedAt": { $ne: null },
            "mainContent.submissionDeadline": { $ne: null },
            $expr: {
              $gt: [
                {
                  $dateTrunc: {
                    date: "$mainContent.completedAt",
                    unit: "day",
                    timezone: "Asia/Ho_Chi_Minh",
                  },
                },
                {
                  $dateTrunc: {
                    date: "$mainContent.submissionDeadline",
                    unit: "day",
                    timezone: "Asia/Ho_Chi_Minh",
                  },
                },
              ],
            },
          },
        ],
      },
    },

    {
      $count: "lateCases",
    },
  ]);

  const lateCases = lateCaseAgg[0]?.lateCases || 0;

  // =====================
  // 🔗 FINAL
  // =====================
  return {
    thamGiaVuViec: caseData.thamGiaVuViec || 0,
    tongHoSo: caseData.tongHoSo || 0,
    hoanThanhHoSo: caseData.hoanThanhHoSo || 0,

    // 🔥 GỘP 2 NGUỒN
    thamMuuVanBan: taskData.thamMuuVanBan || 0,

    treHan: taskData.treHan || 0 + lateCases,
  };
};

export const getDashboardData = async (userId: string, role: string) => {
  const now = new Date();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const isAdmin = role === "admin";

  // =====================
  // 👤 USER
  // =====================
  const user = await User.findById(userId).select("name").lean();

  // =====================
  // 🔥 FILTER CHUNG
  // =====================
  const taskFilter = isAdmin
    ? {}
    : { "assignments.userId": new Types.ObjectId(userId) };

  // =====================
  // 📊 STATS
  // =====================
  const totalTask = await Task.countDocuments(taskFilter);

  const completedTask = await Task.countDocuments({
    ...taskFilter,
    status: "COMPLETED",
  });

  const pendingTask = await Task.countDocuments({
    ...taskFilter,
    status: { $ne: "COMPLETED" },
  });

  const overdueTask = await Task.countDocuments({
    ...taskFilter,
    status: { $ne: "COMPLETED" },
    deadline: { $lt: now },
  });

  // =====================
  // 🔥 URGENT TASKS
  // =====================
  const urgentTasks = await Task.find({
    ...taskFilter,
    status: { $nin: ["COMPLETED", "PENDING_APPROVAL"] },
  })
    .sort({ deadline: 1 })
    .limit(5)
    .select("title deadline status assignments")
    .populate("assignments.userId", "name") // 🔥 admin cần biết ai
    .lean();

  // =====================
  // 🔥 PENDING APPROVAL TASKS
  // =====================

  const pendingApprovalTasks = await Task.find({
    ...taskFilter,
    status: "PENDING_APPROVAL",
  })
    .sort({ updatedAt: -1 })
    .select("title deadline status assignments")
    .populate("assignments.userId", "name")
    .lean();

  // =====================
  // 📅 TASK HÔM NAY
  // =====================
  const todayTasks = await Task.countDocuments({
    ...taskFilter,
    deadline: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: "COMPLETED" },
  });

  // =====================
  // 🔔 NOTIFICATIONS
  // =====================
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("title type createdAt isRead data body")
    .lean();

  // =====================
  // 📈 CHART (7 ngày)
  // =====================
  const last7Days = await Task.aggregate([
    {
      $match: isAdmin
        ? {}
        : { "assignments.userId": new Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%d/%m", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return {
    user: {
      name: user?.name || "",
      role,
    },

    todayTasks,

    stats: {
      totalTask,
      completedTask,
      pendingTask,
      overdueTask,
    },

    urgentTasks,

    pendingApprovalTasks,

    notifications,

    chart: last7Days,
  };
};
