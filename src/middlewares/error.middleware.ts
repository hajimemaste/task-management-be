// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.statusCode || 500;
  const isApiError = err instanceof ApiError;

  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error caught by middleware:", err);
  }

  res.status(status).json({
    message: err.message || "Something went wrong!",
    ...(isApiError
      ? {}
      : {
          stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        }),
  });
};

export default errorMiddleware;
