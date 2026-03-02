import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/requireAdmin.middleware";

const router = Router();

// ================= USER =================

// 🔐 Login local
router.post("/login", authController.loginController);

// 🔐 Login Google
router.post("/login-google", authController.loginWithGoogleController);

// 🔐 Refresh access token
router.post("/refresh-token", authController.refreshAccessTokenController);

// 📩 Register
router.post("/register", authController.registerController);

// 📩 Verify OTP Register
router.post("/verify-otp", authController.verifyOTPController);

// 🔁 Resend OTP Register
router.post("/resend-otp", authController.resendOTPController);

// ================= FORGOT PASSWORD =================

// 📩 Gửi OTP reset
router.post("/forgot-password", authController.forgotPasswordController);

// 🔁 Resend OTP reset
router.post(
  "/resend-reset-password-otp",
  authController.resendResetPasswordOtpController,
);

// 🔑 Reset Password
router.post("/reset-password", authController.resetPasswordController);

// ================= CHANGE PASSWORD =================

// 🔑 Đổi mật khẩu khi đã login
router.post(
  "/change-password",
  authMiddleware,
  authController.changePasswordController,
);

// ================= ADMIN =================

// 📋 Lấy danh sách user theo trạng thái
router.get(
  "/admin/users",
  authMiddleware,
  requireAdmin,
  authController.getUsersByStatusController,
);

// ✅ Duyệt user
router.patch(
  "/admin/users/:id/approve",
  authMiddleware,
  requireAdmin,
  authController.approveUserController,
);

// ❌ Từ chối user
router.patch(
  "/admin/users/:id/reject",
  authMiddleware,
  requireAdmin,
  authController.rejectUserController,
);

export default router;
