import { NextFunction, Request, Response } from "express";
import * as authService from "../services/auth.service";

export const loginController = async (
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const data = await authService.loginService(email, password);

    res.status(200).json({
      message: "Đăng nhập thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const loginWithGoogleController = async (
  req: Request<{}, {}, { firebaseToken: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { firebaseToken } = req.body;

    const data = await authService.googleLoginService(firebaseToken);

    res.status(200).json({
      message: "Đăng nhập Google thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessTokenController = async (
  req: Request<{}, {}, { refreshToken: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    const data = await authService.refreshAccessTokenService(refreshToken);

    res.status(200).json({
      message: "Refresh token thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const registerController = async (
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const result = await authService.registerService(email, password);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyOTPController = async (
  req: Request<{}, {}, { email: string; otp: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyOTPService(email, otp);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resendOTPController = async (
  req: Request<{}, {}, { email: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    const result = await authService.resendOTPService(email);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

interface UserParams {
  id: string;
}

export const approveUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.id.toString();

    const result = await authService.approveUserService(id, adminId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.id.toString();

    const result = await authService.rejectUserService(id, adminId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

interface GetUsersQuery {
  status?: "pending" | "approved" | "rejected";
}

export const getUsersByStatusController = async (
  req: Request<{}, {}, {}, GetUsersQuery>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status } = req.query;

    const users = await authService.getUsersByStatusService(status);

    res.status(200).json({
      message: "Lấy danh sách user thành công",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request<{}, {}, { email: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPasswordService(email);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: Request<{}, {}, { email: string; otp: string; newPassword: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, newPassword } = req.body;

    const result = await authService.resetPasswordService(
      email,
      otp,
      newPassword,
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resendResetPasswordOtpController = async (
  req: Request<{}, {}, { email: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    const result = await authService.resendResetPasswordOtpService(email);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (
  req: Request<{}, {}, { oldPassword: string; newPassword: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.id.toString();

    const result = await authService.changePasswordService(
      userId,
      oldPassword,
      newPassword,
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
