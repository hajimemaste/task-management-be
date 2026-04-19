import { Types } from "mongoose";
import { Task } from "../models/task.model";
import { ApiError } from "../utils/ApiError";
import { sendNotificationToMany } from "./notification.service";
import { deleteFolder, renameFolderService } from "./dropbox.service";
import { User } from "../models/user.model";
import { toEndOfDay } from "../utils/toEndOfDay";
// =======================
// 🔹 1. Tạo task (Admin)
// =======================

export const createTask = async ({
  title,
  description,
  category,
  deadline,
  attachments,
  userIds,
  userId,
}: any) => {
  if (!userIds?.length) {
    throw new ApiError(400, "Phải chọn ít nhất 1 người");
  }

  if (!title || !title.trim()) {
    throw new ApiError(400, "Tên nhiệm vụ không được để trống");
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length < 3) {
    throw new ApiError(400, "Tên nhiệm vụ phải ít nhất 3 ký tự");
  }

  if (cleanTitle.length > 200) {
    throw new ApiError(400, "Tên nhiệm vụ tối đa 200 ký tự");
  }

  const existed = await Task.findOne({
    title: { $regex: `^${cleanTitle}$`, $options: "i" },
    createdBy: userId,
  });

  if (existed) {
    throw new ApiError(400, "Tên nhiệm vụ đã tồn tại");
  }

  const assignments = userIds.map((id: string) => ({
    userId: new Types.ObjectId(id),
    status: "PENDING",
  }));

  const task = await Task.create({
    title,
    description,
    category,
    deadline: toEndOfDay(deadline),
    attachments,
    assignments,
    createdBy: userId,
  });

  // 🔔 notify user
  await sendNotificationToMany({
    userIds,
    title: "Bạn được giao nhiệm vụ",
    body: title,
    type: "TASK_ASSIGNED",
    data: { taskId: task._id.toString() },
  });

  return task;
};

// =======================
// 🔹 2. User nhận task
// =======================

export const acceptTask = async ({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) => {
  const task = await Task.findById(taskId);

  const user = await User.findById(userId).select("name");

  if (!task) throw new ApiError(404, "Task không tồn tại");

  const assignment = task.assignments.find(
    (a) => a.userId.toString() === userId,
  );

  if (!assignment) throw new ApiError(403, "Bạn không thuộc task này");

  // ⚠️ tránh accept nhiều lần
  if (assignment.status !== "PENDING") {
    throw new ApiError(400, "Task đã được nhận trước đó");
  }

  assignment.status = "ACCEPTED";
  assignment.acceptedAt = new Date();

  await task.save();

  // =======================
  // 🔔 Notify Admin
  // =======================

  const userName = user?.name || "Nhân viên";

  await sendNotificationToMany({
    userIds: [task.createdBy.toString()],
    title: `${userName} đã nhận nhiệm vụ`,
    body: `${task.title}`,
    type: "TASK_ACCEPTED",
    data: {
      taskId: task._id.toString(),
      type: "TASK_ACCEPTED",
      acceptedBy: userId,
    },
  });

  return task;
};

// =======================
// 🔹 3. User hoàn thành
// =======================

export const completeTaskByUser = async ({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) => {
  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task không tồn tại");
  }

  const assignment = task.assignments.find(
    (a) => a.userId.toString() === userId,
  );

  if (!assignment) {
    throw new ApiError(403, "Không có quyền");
  }

  // ⚠️ phải accept trước
  if (assignment.status !== "ACCEPTED") {
    throw new ApiError(400, "Bạn chưa nhận nhiệm vụ");
  }

  // ⚠️ tránh bấm nhiều lần
  if (task.status !== "ACTIVE") {
    throw new ApiError(400, "Task không ở trạng thái hợp lệ");
  }

  // =======================
  // 🔥 chuyển sang chờ duyệt
  // =======================

  task.status = "PENDING_APPROVAL";
  task.completedAt = new Date();

  await task.save();

  // =======================
  // 🔔 notify admin
  // =======================

  await sendNotificationToMany({
    userIds: [task.createdBy.toString()],
    title: "Nhiệm vụ đã hoàn thành đang đợi duyệt",
    body: task.title,
    type: "TASK_DONE",
    data: {
      taskId: task._id.toString(),
      type: "TASK_DONE",
      completedBy: userId,
    },
  });

  return task;
};

// =======================
// 🔹 4. Admin duyệt task
// =======================

export const approveTask = async ({ taskId, adminId }: any) => {
  const task = await Task.findById(taskId);

  if (!task) throw new ApiError(404, "Task không tồn tại");

  if (task.status !== "PENDING_APPROVAL") {
    throw new ApiError(400, "Task chưa sẵn sàng để duyệt");
  }

  task.status = "COMPLETED";
  task.approvedBy = adminId;
  task.approvedAt = new Date();

  await task.save();

  await sendNotificationToMany({
    userIds: [task.createdBy.toString()],
    title: "Nhiệm vụ đã hoàn thành và được duyệt",
    body: task.title,
    type: "TASK_APPROVED",
    data: {
      taskId: task._id.toString(),
      type: "TASK_APPROVED",
    },
  });

  return task;
};

// =======================
// 🔹 5. Huỷ task
// =======================

export const deleteTask = async ({ taskId, adminId }: any) => {
  const task = await Task.findById(taskId);

  if (!task) throw new ApiError(404, "Task không tồn tại");

  if (task.status !== "ACTIVE") {
    throw new ApiError(400, "Chỉ được xoá nhiệm vụ đang thực hiện");
  }

  const userIds = task.assignments.map((a) => a.userId.toString());

  // 🔥 xoá folder Dropbox trước (nếu có)
  try {
    if (task.attachments) {
      await deleteFolder(task.attachments);
    }
  } catch (err) {
    console.error("❌ Xoá folder Dropbox lỗi:", err);
    // 👉 không throw để không block xoá task
  }

  // 👉 xoá DB
  await Task.deleteOne({ _id: taskId });

  // 🔔 notification
  await sendNotificationToMany({
    userIds,
    title: "Nhiệm vụ đã bị xoá",
    body: task.title,
    type: "SYSTEM",
    data: { taskId },
  });

  return { success: true };
};

// =======================
// 🔹 6. Lấy task của user
// =======================

export const getMyTasks = async (userId: string) => {
  const tasks = await Task.aggregate([
    {
      $match: {
        "assignments.userId": new Types.ObjectId(userId),
      },
    },

    // 🔥 priority mới
    {
      $addFields: {
        priority: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "OVERDUE"] }, then: 0 },
              { case: { $eq: ["$status", "PENDING_APPROVAL"] }, then: 1 },
              { case: { $eq: ["$status", "ACTIVE"] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },

    {
      $sort: {
        priority: 1,
        deadline: 1,
        updatedAt: -1,
      },
    },
  ]);

  return Task.populate(tasks, {
    path: "assignments.userId",
    select: "name",
  });
};

// =======================
// 🔹 7. Admin lấy tất cả
// =======================

export const getAllTasks = async () => {
  const tasks = await Task.aggregate([
    {
      $addFields: {
        priority: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "OVERDUE"] }, then: 0 },
              { case: { $eq: ["$status", "PENDING_APPROVAL"] }, then: 1 },
              { case: { $eq: ["$status", "ACTIVE"] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    {
      $sort: {
        priority: 1,
        deadline: 1,
        updatedAt: -1,
      },
    },
  ]);

  return Task.populate(tasks, {
    path: "assignments.userId",
    select: "name",
  });
};
// =======================
// 🔹 8. Filter (admin)
// =======================

export const filterTasks = async ({
  status,
  category,
  userId,
  fromDate,
  toDate,
}: any) => {
  const query: any = {};

  if (status) query.status = status;
  if (category) query.category = category;

  if (userId) {
    query["assignments.userId"] = new Types.ObjectId(userId);
  }

  if (fromDate || toDate) {
    query.deadline = {};

    if (fromDate) {
      const [y, m, d] = fromDate.split("-").map(Number);
      query.deadline.$gte = new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    if (toDate) {
      const [y, m, d] = toDate.split("-").map(Number);
      query.deadline.$lte = new Date(y, m - 1, d, 23, 59, 59, 999);
    }
  }

  return Task.find(query).sort({ deadline: 1 });
};

// =======================
// 🔹 9. Lấy chi tiết task
// =======================

const getId = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val._id) return val._id.toString();
  return val.toString();
};

export const getTaskDetail = async ({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) => {
  const task = await Task.findById(taskId)
    .populate("assignments.userId", "name avatar")
    .populate("createdBy", "name");

  if (!task) {
    throw new ApiError(404, "Task không tồn tại");
  }

  // 🔥 lấy user để check role
  const user = await User.findById(userId).select("role");

  if (!user) {
    throw new ApiError(404, "User không tồn tại");
  }

  const isAdmin = user.role === "admin";

  const isAssigned = task.assignments.some((a) => getId(a.userId) === userId);

  const isOwner = getId(task.createdBy) === userId;

  // ✅ cho admin bypass
  if (!isAdmin && !isAssigned && !isOwner) {
    throw new ApiError(403, "Không có quyền xem task này");
  }

  return task;
};

// =======================
// 🔹 10. Cập nhật task
// =======================

export const updateTask = async ({
  taskId,
  userId,
  title,
  description,
  category,
  deadline,
  attachments,
  userIds,
}: any) => {
  const task = await Task.findById(taskId);

  if (!task) throw new ApiError(404, "Task không tồn tại");

  // =======================
  // 🔥 1. VALIDATE
  // =======================
  if (task.status !== "ACTIVE") {
    throw new ApiError(400, "Nhiệm vụ không được này không được cập nhật");
  }

  if (!title || !title.trim()) {
    throw new ApiError(400, "Tên nhiệm vụ không được để trống");
  }

  if (!userIds?.length) {
    throw new ApiError(400, "Phải chọn ít nhất 1 người");
  }

  const cleanTitle = title.trim();

  if (cleanTitle.length < 3) {
    throw new ApiError(400, "Tên nhiệm vụ phải ít nhất 3 ký tự");
  }

  if (cleanTitle.length > 200) {
    throw new ApiError(400, "Tên nhiệm vụ tối đa 200 ký tự");
  }

  const existed = await Task.findOne({
    _id: { $ne: taskId },
    title: { $regex: `^${cleanTitle}$`, $options: "i" },
    createdBy: userId,
  });

  if (existed) {
    throw new ApiError(400, "Tên nhiệm vụ đã tồn tại");
  }

  // =======================
  // 🔥 2. RENAME FOLDER (nếu attachments đổi)
  // =======================
  if (attachments && task.attachments && attachments !== task.attachments) {
    try {
      await renameFolderService(task.attachments, attachments);
    } catch (err) {
      console.error("❌ Rename folder lỗi:", err);
      throw new ApiError(500, "Không thể đổi tên thư mục");
    }
  }

  // =======================
  // 🔥 3. UPDATE BASIC INFO
  // =======================
  task.title = title;
  task.description = description;
  task.category = category;
  task.attachments = attachments;

  // =======================
  // 🔥 3.1 UPDATE STATUS BY DEADLINE
  // =======================

  if (deadline) {
    const deadlineDate = toEndOfDay(deadline);

    task.deadline = deadlineDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineOnly = new Date(deadlineDate);
    deadlineOnly.setHours(0, 0, 0, 0);

    if (deadlineOnly.getTime() < today.getTime()) {
      task.status = "OVERDUE";
    } else {
      task.status = "ACTIVE";
    }
  }
  // =======================
  // 🔥 4. HANDLE ASSIGNMENTS
  // =======================

  const incomingSet = new Set(userIds);

  // 🔥 1. REMOVE user không còn trong list
  task.assignments = task.assignments.filter((a) =>
    incomingSet.has(a.userId.toString()),
  );

  // 🔥 2. ADD user mới
  const currentIds = task.assignments.map((a) => a.userId.toString());

  const newAssignments = userIds
    .filter((id: string) => !currentIds.includes(id))
    .map((id: string) => ({
      userId: new Types.ObjectId(id),
      status: "PENDING",
    }));

  task.assignments.push(...newAssignments);

  await task.save();

  // =======================
  // 🔥 5. REALTIME
  // =======================
  const allUserIds = task.assignments.map((a) => a.userId.toString());

  // =======================
  // 🔔 6. NOTIFY USER
  // =======================
  await sendNotificationToMany({
    userIds: allUserIds,
    title: "Nhiệm vụ đã được cập nhật",
    body: task.title,
    type: "TASK_UPDATED",
    data: {
      taskId: task._id.toString(),
      type: "TASK_UPDATED",
    },
  });

  return task;
};
