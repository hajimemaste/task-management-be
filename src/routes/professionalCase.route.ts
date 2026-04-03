import { Router } from "express";
import * as caseController from "../controllers/professionalCase.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/requireAdmin.middleware";

const router = Router();

// =======================
// 🔹 FILTER
// =======================

// ⚠️ phải đặt TRƯỚC /:id
router.get("/filter", authMiddleware, caseController.filterCaseItems);

// =======================
// 🔹 CASE (hồ sơ tháng)
// =======================

// Lấy toàn bộ hồ sơ (auto tạo tháng hiện tại)
router.get("/", authMiddleware, caseController.getAllCases);

// Lấy hồ sơ theo ID
router.get("/:id", authMiddleware, caseController.getCaseById);

// Tạo hồ sơ (manual - ít dùng)
router.post("/", authMiddleware, caseController.createCase);

// =======================
// 🔹 CASE ITEM (dòng)
// =======================

// Thêm dòng
router.post("/item", authMiddleware, caseController.addCaseItem);

// Update dòng
router.patch("/item/:itemId", authMiddleware, caseController.updateCaseItem);

// Xoá dòng
router.delete("/item/:itemId", authMiddleware, caseController.deleteCaseItem);

// Xuất excel
router.get(
  "/export/:id",
  authMiddleware,
  requireAdmin,
  caseController.exportProfessionalExcel,
);

router.patch(
  "/:caseId/items/:itemId/deadline",
  authMiddleware,
  requireAdmin,
  caseController.setSubmissionDeadlineController,
);

export default router;
