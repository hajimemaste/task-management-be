import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import admin from "../configs/firebase.config";
import { generateOTP } from "../utils/otp.util";
import { sendOTPEmail } from "../utils/sendMail";

// ========================= LOGIN =========================

export const loginService = async (email: string, password: string) => {
  // 1. Tìm user theo email
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "Email hoặc mật khẩu không đúng");
  }

  // 2. Check provider (google không login bằng password)
  if (user.provider !== "local") {
    throw new ApiError(400, "Tài khoản này đăng nhập bằng Google");
  }

  // 3. Check email đã verify OTP chưa
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Email chưa được xác thực");
  }

  // 4. Check admin đã duyệt chưa
  if (user.status !== "approved") {
    throw new ApiError(403, "Tài khoản đang chờ quản trị viên phê duyệt");
  }

  // 5. Check password đúng không
  const isMatch = await bcrypt.compare(password, user.password || "");

  if (!isMatch) {
    throw new ApiError(400, "Email hoặc mật khẩu không đúng");
  }

  // 6. Tạo JWT
  const accessToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    accessToken,
    refreshToken,
  };
};

// ========================= LOGIN/REGISTER GOOGLE =========================

export const googleLoginService = async (firebaseToken: string) => {
  // 1. Verify Firebase ID Token
  const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

  const { email, name, picture } = decodedToken;

  if (!email) {
    throw new ApiError(400, "Email không tồn tại");
  }

  // 2. Check user tồn tại chưa
  let user = await User.findOne({ email });

  // 3. Nếu chưa có → tạo mới (pending)
  if (!user) {
    user = await User.create({
      email,
      name,
      avatar: picture,
      provider: "google",
      isEmailVerified: true,
      status: "pending",
      role: "user",
    });

    throw new ApiError(403, "Tài khoản đã đăng ký, đang chờ admin phê duyệt");
  }

  // 4. Nếu tồn tại nhưng không phải google
  if (user.provider !== "google") {
    throw new ApiError(400, "Email này đã đăng ký bằng tài khoản & mật khẩu");
  }

  // 5. Check admin duyệt chưa
  if (user.status !== "approved") {
    throw new ApiError(403, "Tài khoản đang chờ quản trị viên phê duyệt");
  }

  // 6. Tạo JWT
  const accessToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" },
  );

  return {
    accessToken,
    refreshToken,
  };
};

// ========================= REFRESH ACCESS TOKEN =========================

export const refreshAccessTokenService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token required");
  }

  let decoded: any;

  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
  } catch {
    throw new ApiError(401, "Refresh token invalid");
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.status !== "approved") {
    throw new ApiError(403, "Tài khoản chưa được admin duyệt");
  }

  const newAccessToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  return {
    accessToken: newAccessToken,
  };
};

// ========================= REGISTER =========================

export const registerService = async (email: string, password: string) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "Email đã tồn tại");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const otp = generateOTP();

  await User.create({
    email,
    password: hashedPassword,
    provider: "local",
    otp,
    otpExpiredAt: new Date(Date.now() + 5 * 60 * 1000),
    isEmailVerified: false,
    status: "pending",
    role: "user",
  });

  await sendOTPEmail(email, otp);

  return {
    message: "Đã gửi OTP về email",
  };
};
