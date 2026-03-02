import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthTokenPayload } from "../types/jwt.type";
import { ApiError } from "../utils/ApiError";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Chưa đăng nhập"));
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET chưa được cấu hình");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof decoded === "string") {
      return next(new ApiError(401, "Token không hợp lệ"));
    }

    // type guard
    const payload = decoded as JwtPayload & AuthTokenPayload;

    if (!payload.id || !payload.email || !payload.role) {
      return next(new ApiError(401, "Token không hợp lệ"));
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    return next(new ApiError(401, "Token không hợp lệ"));
  }
};
