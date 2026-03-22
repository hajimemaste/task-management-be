import { Types } from "mongoose";
import { Task } from "../models/task.model";
import { ApiError } from "../utils/ApiError";
import { sendNotificationToMany } from "./notification.service";
import { emitToUsers } from "../helpers/socket.helper";

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
  adminId,
}: any) => {
  if (!userIds?.length) {
    throw new ApiError(400, "Phải chọn ít nhất 1 người");
  }

  const assignments = userIds.map((id: string) => ({
    userId: new Types.ObjectId(id),
    status: "PENDING",
  }));

  const task = await Task.create({
    title,
    description,
    category,
    deadline,
    attachments,
    assignments,
    createdBy: adminId,
  });

  emitToUsers(userIds, "task:assigned", {
    taskId: task._id,
    title: task.title,
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

  emitToUsers([task.createdBy.toString()], "task:accepted", {
    taskId,
    userId,
  });

  // =======================
  // 🔔 Notify Admin
  // =======================

  await sendNotificationToMany({
    userIds: [task.createdBy.toString()],
    title: "Nhân viên đã nhận nhiệm vụ",
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

  emitToUsers([task.createdBy.toString()], "task:completed", {
    taskId,
  });

  // =======================
  // 🔔 notify admin
  // =======================

  await sendNotificationToMany({
    userIds: [task.createdBy.toString()],
    title: "Nhiệm vụ đã hoàn thành",
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

  emitToUsers(
    task.assignments.map((a) => a.userId.toString()),
    "task:approved",
    { taskId },
  );

  return task;
};

// =======================
// 🔹 5. Huỷ task
// =======================

export const cancelTask = async ({ taskId, adminId }: any) => {
  const task = await Task.findById(taskId);

  if (!task) throw new ApiError(404, "Task không tồn tại");

  task.status = "CANCELLED";
  task.cancelledAt = new Date();

  await task.save();

  const userIds = task.assignments.map((a) => a.userId.toString());

  emitToUsers(userIds, "task:cancelled", { taskId });

  await sendNotificationToMany({
    userIds,
    title: "Task đã bị huỷ",
    body: task.title,
    type: "TASK_CANCELLED",
    data: { taskId },
  });

  return task;
};

// =======================
// 🔹 6. Lấy task của user
// =======================

export const getMyTasks = async (userId: string) => {
  return Task.find({
    "assignments.userId": new Types.ObjectId(userId),
  }).sort({ createdAt: -1 });
};

// =======================
// 🔹 7. Admin lấy tất cả
// =======================

export const getAllTasks = async () => {
  return Task.find()
    .sort({ createdAt: -1 })
    .populate("assignments.userId", "name");
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
    if (fromDate) query.deadline.$gte = fromDate;
    if (toDate) query.deadline.$lte = toDate;
  }

  return Task.find(query).sort({ deadline: 1 });
};
