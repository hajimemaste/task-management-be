import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if ((req as any).user.role !== "admin") {
    throw new ApiError(403, "Không có quyền truy cập");
  }

  next();
};
