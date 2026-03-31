import { NextFunction, Request, Response } from "express";
import * as taskService from "../services/task.service";
import { ApiError } from "../utils/ApiError";

// =======================
// 🔹 1. Tạo task (Admin)
// =======================

export const createTask = async (req: Request, res: Response) => {
  const { title, description, category, deadline, attachments, userIds } =
    req.body;

  const adminId = req.user!.id;

  const data = await taskService.createTask({
    title,
    description,
    category,
    deadline: new Date(deadline),
    attachments,
    userIds,
    adminId,
  });

  res.json({ success: true, data });
};

// =======================
// 🔹 2. User nhận task
// =======================

export const acceptTask = async (req: Request, res: Response) => {
  const rawTaskId = req.params.taskId;

  if (!rawTaskId || Array.isArray(rawTaskId)) {
    throw new ApiError(400, "taskId không hợp lệ");
  }

  const userId = req.user!.id.toString();

  const data = await taskService.acceptTask({
    taskId: rawTaskId,
    userId,
  });

  res.json({ success: true, data });
};

// =======================
// 🔹 3. User hoàn thành (chờ duyệt)
// =======================

export const completeTask = async (req: Request, res: Response) => {
  const rawTaskId = req.params.taskId;

  if (!rawTaskId || Array.isArray(rawTaskId)) {
    throw new ApiError(400, "taskId không hợp lệ");
  }

  const userId = req.user!.id.toString();

  const data = await taskService.completeTaskByUser({
    taskId: rawTaskId,
    userId,
  });

  res.json({ success: true, data });
};

// =======================
// 🔹 4. Admin duyệt
// =======================

export const approveTask = async (req: Request, res: Response) => {
  const rawTaskId = req.params.taskId;

  if (!rawTaskId || Array.isArray(rawTaskId)) {
    throw new ApiError(400, "taskId không hợp lệ");
  }

  const adminId = req.user!.id;

  const data = await taskService.approveTask({
    taskId: rawTaskId,
    adminId,
  });

  res.json({ success: true, data });
};

// =======================
// 🔹 5. Huỷ task
// =======================

export const cancelTask = async (req: Request, res: Response) => {
  const rawTaskId = req.params.taskId;

  if (!rawTaskId || Array.isArray(rawTaskId)) {
    throw new ApiError(400, "taskId không hợp lệ");
  }

  const adminId = req.user!.id;

  const data = await taskService.deleteTask({
    taskId: rawTaskId,
    adminId,
  });

  res.json({ success: true, data });
};

// =======================
// 🔹 6. Lấy task của tôi
// =======================

export const getMyTasks = async (req: Request, res: Response) => {
  try {
    console.log("🔥 HIT getMyTasks");

    console.log("👉 req.user:", req.user);

    const userId = req.user?.id?.toString();

    console.log("👉 userId:", userId);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized - missing user",
      });
    }

    const data = await taskService.getMyTasks(userId);

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getMyTasks error:", err);
    throw err;
  }
};
// =======================
// 🔹 7. Admin lấy tất cả
// =======================

export const getAllTasks = async (req: Request, res: Response) => {
  const data = await taskService.getAllTasks();

  res.json({ success: true, data });
};

// =======================
// 🔹 8. Filter (Admin)
// =======================

export const filterTasks = async (req: Request, res: Response) => {
  const { status, category, userId, fromDate, toDate } = req.query;

  const data = await taskService.filterTasks({
    status: status as string,
    category: category as string,
    userId: userId as string,
    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
  });

  res.json({ success: true, data });
};

export const getTaskDetailController = async (req: any, res: any) => {
  try {
    const userId = req.user!.id.toString();

    const { taskId } = req.params;

    const task = await taskService.getTaskDetail({ taskId, userId });

    res.json({
      success: true,
      data: task,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

export const updateTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { taskId } = req.params;

    const { title, description, category, deadline, attachments, userIds } =
      req.body;

    const adminId = req.user?.id.toString();

    const task = await taskService.updateTask({
      taskId,
      adminId,
      title,
      description,
      category,
      deadline,
      attachments,
      userIds,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật nhiệm vụ thành công",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};
