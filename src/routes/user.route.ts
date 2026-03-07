import express from "express";
import * as userController from "../controllers/user.controller";

import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// 👤 Lấy thông tin profile của user đang đăng nhập
router.get("/profile", authMiddleware, userController.getProfileController);

// ✏️ Cập nhật profile user
router.patch(
  "/profile",
  authMiddleware,
  userController.updateProfileController,
);

// 👥 Lấy danh sách user đang hoạt động (status = approved, không gồm admin)
router.get(
  "/active-users",
  authMiddleware,
  userController.getActiveUsersController,
);

// 👀 Xem profile của user khác
router.get(
  "/users/:id",
  authMiddleware,
  userController.getUserProfileController,
);

export default router;
