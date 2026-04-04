import { NextFunction, Request, Response } from "express";
import {
  updateProfileService,
  getProfileService,
  getActiveUsersService,
  getUserProfileService,
  saveFCMTokenService,
  removeFCMTokenService,
  getFullStatisticsAggregate,
  getUserCompletedTasks,
  getDashboardData,
  getMyStatisticsAggregate,
} from "../services/user.service";

/**
 * ✏️ Cập nhật profile
 */
export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id.toString();

    const user = await updateProfileService(userId, req.body);

    res.status(200).json({
      message: "Update profile successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 👤 Lấy profile của user đang đăng nhập
 */
export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id.toString();

    const user = await getProfileService(userId);

    res.status(200).json({
      message: "Get profile successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 👥 Lấy danh sách user đang hoạt động
 */
export const getActiveUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id.toString();

    const users = await getActiveUsersService(userId);

    res.status(200).json({
      message: "Get active users successfully",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 👀 Xem profile của user khác
 */
export const getUserProfileController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const user = await getUserProfileService(id);

    res.status(200).json({
      message: "Get user profile successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const saveFCMToken = async (req: Request, res: Response) => {
  const userId = req.user!.id.toString();
  const { token } = req.body;

  await saveFCMTokenService(userId, token);

  res.json({ success: true });
};

export const removeFCMToken = async (req: Request, res: Response) => {
  const userId = req.user!.id.toString();
  const { token } = req.body;

  await removeFCMTokenService(userId, token);

  res.json({ success: true });
};

// =========================
// 🔥 GET FULL STATISTICS
// =========================
export const getFullStatisticsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = await getFullStatisticsAggregate();

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error("❌ Get statistics error:", err);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Get statistics failed",
    });
  }
};

export const getMyCompletedTasksController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user!.id.toString();

    const tasks = await getMyStatisticsAggregate(userId);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err: any) {
    console.error("❌ Get completed tasks error:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Get completed tasks failed",
    });
  }
};

export const getCompletedTasksByUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;

    const tasks = await getUserCompletedTasks(userId.toString());

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err: any) {
    console.error("❌ Get user tasks error:", err);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Get tasks failed",
    });
  }
};

export const getDashboardController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id.toString();
    const role = req.user!.role.toString();

    const data = await getDashboardData(userId, role);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err);

    res.status(500).json({
      success: false,
      message: "Get dashboard failed",
    });
  }
};
