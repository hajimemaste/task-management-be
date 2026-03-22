import { Router } from "express";
import * as autopsyController from "../controllers/autopsyCase.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/requireAdmin.middleware";

const router = Router();

// =======================
// 🔹 FILTER (phải đặt trước)
// =======================

router.get("/filter", authMiddleware, autopsyController.filterCaseItems);

// =======================
// 🔹 CASE
// =======================

// Lấy tất cả hồ sơ
router.get("/", authMiddleware, autopsyController.getAllCases);

// Lấy theo ID
router.get("/:id", authMiddleware, autopsyController.getCaseById);

// Tạo hồ sơ
router.post("/", authMiddleware, autopsyController.createCase);

// =======================
// 🔹 ITEM
// =======================

// Thêm dòng
router.post("/item", authMiddleware, autopsyController.addCaseItem);

// Update dòng
router.patch("/item/:itemId", authMiddleware, autopsyController.updateCaseItem);

// Xoá dòng
router.delete(
  "/item/:itemId",
  authMiddleware,
  autopsyController.deleteCaseItem,
);

// Xuất excel
router.get(
  "/export",
  authMiddleware,
  requireAdmin,
  autopsyController.exportAutopsy,
);

export default router;
