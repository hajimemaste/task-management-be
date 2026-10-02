import { ApiError } from "./ApiError";

// 🔥 thư mục gốc chứa file của app (xem dropbox.controller createFolder)
const DROPBOX_ROOT = "/app";

// 👉 chuẩn hoá path: thêm "/" đầu, gộp "//", bỏ "/" cuối
const normalize = (path: string) => {
  const p = `/${path.trim()}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return p || "/";
};

// 👉 path an toàn = nằm BÊN TRONG /app (không phải chính /app), không có "." / ".."
export const isSafeTaskFolder = (path?: string | null) => {
  if (!path || typeof path !== "string") return false;

  const p = normalize(path);
  const segments = p.split("/").filter(Boolean);

  if (segments.some((s) => s === "." || s === "..")) return false;

  // Dropbox không phân biệt hoa thường
  if (segments[0]?.toLowerCase() !== DROPBOX_ROOT.slice(1)) return false;

  return segments.length >= 2;
};

// 👉 validate input attachments từ client, trả về path đã chuẩn hoá
export const validateTaskFolder = (path?: string | null) => {
  if (path === undefined || path === null || path === "") return undefined;

  if (!isSafeTaskFolder(path)) {
    throw new ApiError(
      400,
      `Thư mục đính kèm không hợp lệ (phải nằm trong ${DROPBOX_ROOT}/...)`,
    );
  }

  return normalize(path);
};
