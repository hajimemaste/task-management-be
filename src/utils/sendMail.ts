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

export const sendApproveAccountEmail = async (email: string, name: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Task Management <onboarding@resend.dev>",
      to: email,
      subject: "Tài khoản của bạn đã được duyệt",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Xin chào ${name}</h2>
          <p>Chúc mừng! Tài khoản của bạn đã được <b>Admin phê duyệt</b>.</p>

          <p>Bây giờ bạn có thể đăng nhập và sử dụng hệ thống.</p>

          <p style="margin-top:20px">
            Nếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Send approve email failed");
    }

    console.log("Approve email sent:", data);
  } catch (err) {
    console.error("Approve email error:", err);
    throw err;
  }
};

export const sendRejectAccountEmail = async (email: string, name: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Task Management <onboarding@resend.dev>",
      to: email,
      subject: "Thông báo về tài khoản của bạn",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Xin chào ${name}</h2>

          <p>Rất tiếc, tài khoản của bạn đã <b>không được phê duyệt</b>.</p>

          <p>
            Nếu bạn cho rằng đây là nhầm lẫn hoặc cần thêm thông tin,
            vui lòng liên hệ với quản trị viên để được hỗ trợ.
          </p>

          <p style="margin-top:20px">
            Cảm ơn bạn đã quan tâm đến hệ thống của chúng tôi.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Send reject email failed");
    }

    console.log("Reject email sent:", data);
  } catch (err) {
    console.error("Reject email error:", err);
    throw err;
  }
};
