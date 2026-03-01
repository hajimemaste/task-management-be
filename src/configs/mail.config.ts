import dotenv from "dotenv";
dotenv.config();

export const mailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
};
