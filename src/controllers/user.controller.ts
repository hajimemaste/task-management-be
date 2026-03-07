import { NextFunction, Request, Response } from "express";
import {
  updateProfileService,
  getProfileService,
  getActiveUsersService,
  getUserProfileService,
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
    const users = await getActiveUsersService();

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
