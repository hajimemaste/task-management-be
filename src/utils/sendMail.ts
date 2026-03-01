import nodemailer from "nodemailer";

export const sendOTPEmail = async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Mã OTP xác thực",
    html: `<h2>Mã OTP của bạn là: ${otp}</h2>`,
  });
};
