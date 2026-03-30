import { Request, Response } from "express";
import {
  uploadFile,
  uploadMultiple,
  deleteFile,
  listFiles,
  renameFile,
  createFolderService,
  getTreeService,
} from "../services/dropbox.service";
import { DropboxError } from "../utils/dropboxError";

export const uploadSingle = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const path = req.body.path;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!path) {
      return res.status(400).json({ message: "Missing path" });
    }

    const fullPath = `${path}/${Date.now()}_${file.originalname}`;

    const url = await uploadFile(file.buffer, fullPath);

    res.json({ url });
  } catch (err: any) {
    console.error("🔥 ERROR:", err);

    res.status(err.status || 500).json({
      message: err.message,
      details: err.details || null,
    });
  }
};

export const uploadMulti = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const path = req.body.path;

  if (!files?.length) {
    return res.status(400).json({ message: "No files" });
  }

  if (!path) {
    return res.status(400).json({ message: "Missing path" });
  }

  const urls = await uploadMultiple(files, path);

  res.json({ urls });
};

export const getFiles = async (req: Request, res: Response) => {
  const { folder } = req.body;
  const data = await listFiles(folder);
  res.json(data);
};

export const removeFile = async (req: Request, res: Response) => {
  await deleteFile(req.body.path);
  res.json({ success: true });
};

export const rename = async (req: Request, res: Response) => {
  const { from, to } = req.body;
  await renameFile(from, to);
  res.json({ success: true });
};

export const createFolder = async (req: Request, res: Response) => {
  try {
    const { folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({ message: "Missing data" });
    }

    const path = `/app/${folderName}`;

    const result = await createFolderService(path);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create folder failed" });
  }
};

export const getTree = async (req: Request, res: Response) => {
  try {
    const { path } = req.body;

    const rootPath = path || "";

    const tree = await getTreeService(rootPath);

    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Get tree failed" });
  }
};
