import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// =======================
// 🔔 Notification APIs
// =======================

// Lấy danh sách notification
router.get("/", authMiddleware, notificationController.getNotifications);

// Lấy số lượng chưa đọc (badge)
router.get(
  "/unread-count",
  authMiddleware,
  notificationController.getUnreadCount,
);

// Mark 1 notification là đã đọc
router.patch("/:id/read", authMiddleware, notificationController.markAsRead);

export default router;
