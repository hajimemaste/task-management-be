import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IJwtPayload } from "../types/jwt.type";
import { ApiError } from "../utils/ApiError";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Chưa đăng nhập");
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret",
    ) as IJwtPayload;

    req.user = decoded;

    next();
  } catch {
    throw new ApiError(401, "Token không hợp lệ");
  }
};
