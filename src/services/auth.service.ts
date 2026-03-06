import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import admin from "../configs/firebase.config";
import { generateOTP } from "../utils/otp.util";
import {
  sendApproveAccountEmail,
  sendOTPEmail,
  sendRejectAccountEmail,
} from "../utils/sendMail";

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
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
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

  const { uid, email, name, picture } = decodedToken;

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
      avatar: {
        secure_url: picture,
        public_id: "google-avatar",
        resource_type: "image",
        original_filename: "google_avatar",
      },
      provider: "google",
      isEmailVerified: true,
      firebaseUid: uid,
      status: "pending",
      role: "user",
    });

    return {
      pending: true,
      message: "Tài khoản đã đăng ký, đang chờ admin phê duyệt",
    };
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
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
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

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.status !== "approved") {
    throw new ApiError(403, "Tài khoản chưa được admin duyệt");
  }

  const newAccessToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
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

export const registerService = async (
  email: string,
  password: string,
  name: string,
) => {
  const existingUser = await User.findOne({ email });

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOTP();
  const otpExpiredAt = new Date(Date.now() + 5 * 60 * 1000);

  // ✅ Case 1: Email đã tồn tại và đã verify
  if (existingUser && existingUser.isEmailVerified) {
    throw new ApiError(400, "Email đã tồn tại");
  }

  // ✅ Case 2: Email tồn tại nhưng chưa verify -> update
  if (existingUser && !existingUser.isEmailVerified) {
    existingUser.password = hashedPassword;
    existingUser.otp = otp;
    existingUser.otpExpiredAt = otpExpiredAt;
    existingUser.status = "pending";
    existingUser.name = name;

    await existingUser.save();
  }

  // ✅ Case 3: Chưa tồn tại -> tạo mới
  if (!existingUser) {
    await User.create({
      email,
      password: hashedPassword,
      provider: "local",
      otp,
      name,
      otpExpiredAt,
      isEmailVerified: false,
      status: "pending",
      role: "user",
    });
  }

  await sendOTPEmail(email, otp);

  return {
    message: "Đã gửi OTP về email",
  };
};

export const verifyOTPService = async (email: string, otp: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  // ✅ đã verify rồi thì không cần verify nữa
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email đã được xác thực");
  }

  // ❌ chưa có OTP
  if (!user.otp || !user.otpExpiredAt) {
    throw new ApiError(400, "OTP không hợp lệ");
  }

  // ❌ OTP sai
  if (user.otp !== otp) {
    throw new ApiError(400, "OTP không đúng");
  }

  // ❌ OTP hết hạn
  if (user.otpExpiredAt < new Date()) {
    throw new ApiError(400, "OTP đã hết hạn");
  }

  // ✅ Verify thành công
  user.isEmailVerified = true;
  user.status = "pending";
  user.otp = undefined;
  user.otpExpiredAt = undefined;

  await user.save();

  return {
    message:
      "Xác thực email thành công. Vui lòng chờ admin phê duyệt tài khoản",
  };
};

export const resendOTPService = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  // ❌ Đã verify rồi thì không gửi nữa
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email đã được xác thực");
  }

  // ❌ OTP vẫn còn hạn -> không cho resend (anti spam)
  if (user.otpExpiredAt && user.otpExpiredAt > new Date()) {
    throw new ApiError(
      429,
      "OTP vẫn còn hiệu lực, vui lòng kiểm tra email hoặc thử lại sau",
    );
  }

  // ✅ Tạo OTP mới
  const newOtp = generateOTP();

  user.otp = newOtp;
  user.otpExpiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  await user.save();

  await sendOTPEmail(email, newOtp);

  return {
    message: "Đã gửi lại OTP về email",
  };
};

// ========================= ADMIN =========================
export const approveUserService = async (userId: string, adminId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User không tồn tại");
  }

  // ❌ chưa verify mail thì không cho duyệt
  if (!user.isEmailVerified) {
    throw new ApiError(400, "User chưa xác thực email");
  }

  // ❌ đã duyệt rồi
  if (user.status === "approved") {
    throw new ApiError(400, "User đã được duyệt");
  }

  user.status = "approved";
  user.approvedBy = adminId;
  user.approvedAt = new Date();

  await user.save();

  await sendApproveAccountEmail(user.email, user.name);

  return {
    message: "Duyệt tài khoản thành công",
  };
};

export const rejectUserService = async (userId: string, adminId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User không tồn tại");
  }

  if (user.status === "rejected") {
    throw new ApiError(400, "User đã bị từ chối trước đó");
  }

  await sendRejectAccountEmail(user.email, user.name);

  if (user.firebaseUid) {
    try {
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (error) {
      console.error("Delete Firebase user error:", error);
    }
  }

  // xoá user trong database
  await User.findByIdAndDelete(userId);

  return {
    message: "Đã từ chối và xoá tài khoản",
  };
};
export const getUsersByStatusService = async (
  status?: "pending" | "approved" | "rejected",
) => {
  const filter: any = {};

  if (status) {
    filter.status = status;
  }

  const users = await User.find(filter)
    .select(
      "-password -otp -otpExpiredAt -resetPasswordOtp -resetPasswordOtpExpiredAt",
    )
    .sort({ createdAt: -1 });

  return users;
};

// ========================= FORGOT PASSWORD =========================
export const forgotPasswordService = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  if (!user.isEmailVerified || user.status !== "approved") {
    throw new ApiError(403, "Tài khoản chưa được kích hoạt");
  }

  // ❌ OTP reset vẫn còn hạn
  if (
    user.resetPasswordOtpExpiredAt &&
    user.resetPasswordOtpExpiredAt > new Date()
  ) {
    throw new ApiError(429, "OTP vẫn còn hiệu lực, vui lòng kiểm tra email");
  }

  const otp = generateOTP();

  user.resetPasswordOtp = otp;
  user.resetPasswordOtpExpiredAt = new Date(Date.now() + 5 * 60 * 1000);

  await user.save();

  await sendOTPEmail(email, otp);

  return {
    message: "Đã gửi OTP reset mật khẩu",
  };
};

export const resetPasswordService = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiredAt) {
    throw new ApiError(400, "OTP không hợp lệ");
  }

  if (user.resetPasswordOtp !== otp) {
    throw new ApiError(400, "OTP không đúng");
  }

  if (user.resetPasswordOtpExpiredAt < new Date()) {
    throw new ApiError(400, "OTP đã hết hạn");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpiredAt = undefined;

  await user.save();

  return {
    message: "Đặt lại mật khẩu thành công",
  };
};

export const resendResetPasswordOtpService = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  if (!user.isEmailVerified || user.status !== "approved") {
    throw new ApiError(403, "Tài khoản chưa được kích hoạt");
  }

  // ❌ OTP reset vẫn còn hạn
  if (
    user.resetPasswordOtpExpiredAt &&
    user.resetPasswordOtpExpiredAt > new Date()
  ) {
    throw new ApiError(
      429,
      "OTP vẫn còn hiệu lực, vui lòng kiểm tra email hoặc thử lại sau",
    );
  }

  const newOtp = generateOTP();

  user.resetPasswordOtp = newOtp;
  user.resetPasswordOtpExpiredAt = new Date(Date.now() + 5 * 60 * 1000);

  await user.save();

  await sendOTPEmail(email, newOtp);

  return {
    message: "Đã gửi lại OTP reset mật khẩu",
  };
};

export const checkResetPasswordOtpService = async (
  email: string,
  otp: string,
) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "Email không tồn tại");
  }

  if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiredAt) {
    throw new ApiError(400, "OTP không hợp lệ");
  }

  if (user.resetPasswordOtpExpiredAt < new Date()) {
    throw new ApiError(400, "OTP đã hết hạn");
  }

  if (user.resetPasswordOtp !== otp) {
    throw new ApiError(400, "OTP không đúng");
  }

  return {
    message: "OTP hợp lệ",
  };
};

// ========================= CHANGE PASSWORD =========================
export const changePasswordService = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User không tồn tại");
  }

  if (!user.password) {
    throw new ApiError(400, "Tài khoản không hỗ trợ đổi mật khẩu");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    throw new ApiError(400, "Mật khẩu cũ không đúng");
  }

  const isSame = await bcrypt.compare(newPassword, user.password);

  if (isSame) {
    throw new ApiError(400, "Mật khẩu mới không được trùng mật khẩu cũ");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();

  return {
    message: "Đổi mật khẩu thành công",
  };
};
