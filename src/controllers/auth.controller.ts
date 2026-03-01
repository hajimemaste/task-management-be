import { NextFunction, Request, Response } from "express";
import * as authService from "../services/auth.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginService(email, password);

    res.json({
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const loginWithGoogle = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { firebaseToken } = req.body;

    const result = await authService.googleLoginService(firebaseToken);

    res.json({
      message: "Đăng nhập Google thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    const data = await authService.refreshAccessTokenService(refreshToken);

    res.json({
      message: "Refresh token thành công",
      data,
    });
  } catch (err) {
    next(err);
  }
};
