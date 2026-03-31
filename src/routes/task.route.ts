import express from "express";
import * as taskController from "../controllers/task.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/requireAdmin.middleware";

const router = express.Router();

// =======================
// 🔹 FILTER (đặt trước)
// =======================

router.get("/filter", authMiddleware, taskController.filterTasks);

// =======================
// 🔹 USER
// =======================

// Chi tiết nhiệm vụ
router.get("/:taskId", authMiddleware, taskController.getTaskDetailController);

// lấy task của mình
router.get("/me", authMiddleware, taskController.getMyTasks);

// nhận task
router.patch("/:taskId/accept", authMiddleware, taskController.acceptTask);

// hoàn thành task (chờ duyệt)
router.patch("/:taskId/complete", authMiddleware, taskController.completeTask);

// =======================
// 🔹 ADMIN
// =======================

// tạo task
router.post("/", authMiddleware, requireAdmin, taskController.createTask);

// lấy tất cả
router.get("/", authMiddleware, requireAdmin, taskController.getAllTasks);

// duyệt task
router.patch(
  "/:taskId/approve",
  authMiddleware,
  requireAdmin,
  taskController.approveTask,
);

// huỷ task
router.patch(
  "/:taskId/cancel",
  authMiddleware,
  requireAdmin,
  taskController.cancelTask,
);

// Cập nhật task
router.put(
  "/:taskId",
  authMiddleware,
  requireAdmin,
  taskController.updateTaskController,
);

export default router;
