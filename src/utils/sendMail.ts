import { resend } from "../configs/resend.config";

export const sendOTPEmail = async (email: string, otp: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Task Management <onboarding@resend.dev>",
      to: email,
      subject: "Mã OTP xác thực",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Mã OTP của bạn</h2>
          <p style="font-size: 20px; font-weight: bold">${otp}</p>
          <p>Mã sẽ hết hạn sau 5 phút.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Send mail failed");
    }

    console.log("Email sent:", data);
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
};
