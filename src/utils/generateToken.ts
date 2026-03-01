import jwt from "jsonwebtoken";

export const generateToken = (userId: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET chưa được cấu hình");
  return jwt.sign({ id: userId }, secret, { expiresIn: "3d" });
};

export const generateRefreshToken = (userId: string) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET chưa được cấu hình");
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
};
