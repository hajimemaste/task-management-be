import { CorsOptions } from "cors";

// Danh sách domain được phép gọi API từ trình duyệt (web admin).
// Cấu hình bằng biến môi trường CORS_ORIGINS, phân tách bằng dấu phẩy:
//   CORS_ORIGINS=https://admin.example.com,http://localhost:5173
// App mobile (React Native) không gửi header Origin nên không bị ảnh hưởng.
const DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

// Web quản trị đã deploy — luôn được phép, kể cả khi chưa đặt CORS_ORIGINS
const DEFAULT_PROD_ORIGINS = ["https://task-management-web-production.up.railway.app"];

export const getAllowedOrigins = (): string[] => {
  // Đọc lúc chạy (không đọc lúc import) vì dotenv.config() được gọi sau khi import app
  const fromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (fromEnv.length) return [...new Set([...DEFAULT_PROD_ORIGINS, ...fromEnv])];

  return process.env.NODE_ENV === "production"
    ? DEFAULT_PROD_ORIGINS
    : [...DEFAULT_PROD_ORIGINS, ...DEFAULT_DEV_ORIGINS];
};

export const isOriginAllowed = (origin?: string) => {
  // Không có Origin: app mobile, Postman, server-to-server
  if (!origin) return true;

  return getAllowedOrigins().includes(origin.replace(/\/$/, ""));
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);

    // Trả về false: không gắn header CORS, trình duyệt sẽ chặn
    return callback(null, false);
  },
  credentials: true,
};
