import { Router } from "express";
import multer from "multer";
import {
  uploadSingle,
  uploadMulti,
  getFiles,
  removeFile,
  rename,
  createFolder,
} from "../controllers/dropbox.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024, // 🔥 20MB (tăng lên cho file lớn)
    files: 10,
  },

  fileFilter: (req, file, cb) => {
    cb(null, true);

    if (file.mimetype.includes("exe")) {
      return cb(new Error("File not allowed"));
    }
  },
});

// ================== UPLOAD ==================

// 📤 upload 1 file
router.post(
  "/upload/single",
  authMiddleware,
  upload.single("file"),
  uploadSingle,
);

// 📤 upload nhiều file
router.post(
  "/upload/multiple",
  authMiddleware,
  upload.array("files", 10),
  uploadMulti,
);

// ================== FILE MANAGER ==================

// 📥 Tạo forder
router.post("/create-folder", authMiddleware, createFolder);

// 📥 list file
router.post("/list", authMiddleware, getFiles);

// ❌ delete file
router.delete("/delete", authMiddleware, removeFile);

// ✏️ rename file
router.put("/rename", authMiddleware, rename);

export default router;
