import { bucket } from "../configs/firebase.config";

/**
 * Xóa file trong Firebase Storage
 * @param path đường dẫn file, ví dụ: "avatars/user1.png"
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    await bucket.file(path).delete();
    console.log(`✅ Deleted file: ${path}`);
  } catch (err: any) {
    console.error("Lỗi xóa ảnh Firebase:", err);
    // throw err;
  }
};
