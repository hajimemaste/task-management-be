import { DropboxError } from "../utils/dropboxError";
import { TreeNode } from "../interfaces/dropbox.interface";
import fetch from "node-fetch";

const TOKEN = process.env.DROPBOX_TOKEN!;

if (!TOKEN) {
  throw new Error("Missing DROPBOX_TOKEN");
}

const API_UPLOAD = "https://content.dropboxapi.com/2/files/upload";
const API_SHARE =
  "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";
const API_LIST_LINK = "https://api.dropboxapi.com/2/sharing/list_shared_links";
const API_DELETE = "https://api.dropboxapi.com/2/files/delete_v2";
const API_MOVE = "https://api.dropboxapi.com/2/files/move_v2";
const API_LIST = "https://api.dropboxapi.com/2/files/list_folder";
const API_CREATE_FOLDER = "https://api.dropboxapi.com/2/files/create_folder_v2";
const API_LIST_CONTINUE =
  "https://api.dropboxapi.com/2/files/list_folder/continue";

const getHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
});

// 🔥 phân loại folder theo file
const getFolderByMime = (mimetype: string) => {
  if (mimetype.startsWith("image/")) return "images";
  if (mimetype.startsWith("video/")) return "videos";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.includes("pdf")) return "documents";
  return "others";
};

// 🔥 tạo folder
export const createFolderService = async (path: string) => {
  const res = await fetch(API_CREATE_FOLDER, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      path,
      autorename: false,
    }),
  });

  const data: any = await res.json();

  // 👉 nếu folder đã tồn tại → bỏ qua
  if (
    data.error?.[".tag"] === "path" &&
    data.error?.path?.[".tag"] === "conflict"
  ) {
    return;
  }

  if (data.error) {
    throw new DropboxError("Create folder failed", 500, data);
  }
};

// 🔥 đảm bảo folder tồn tại
export const ensureFolder = async (path: string) => {
  try {
    const safePath = path.startsWith("/") ? path : `/${path}`;
    await createFolderService(safePath);
  } catch (err) {
    console.log("Folder exists or error:", err);
  }
};

// 📤 Upload 1 file
export const uploadFile = async (buffer: Buffer, path: string) => {
  // 🔥 đảm bảo folder tồn tại
  const folderPath = path.substring(0, path.lastIndexOf("/"));
  await ensureFolder(folderPath);
  const safePath = path.startsWith("/") ? path : `/${path}`;
  // 🚀 upload
  const uploadRes = await fetch(API_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: safePath,
        mode: "add",
        autorename: true,
      }),
    },
    body: buffer,
  });

  const uploadText = await uploadRes.text();

  let uploadData: any;

  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    console.error("❌ RAW Dropbox upload error:", uploadText);
    throw new Error(uploadText);
  }

  // ❗ QUAN TRỌNG
  if (!uploadRes.ok) {
    console.error("❌ Dropbox upload error:", uploadData);

    throw new DropboxError(
      "Upload file to Dropbox failed",
      uploadRes.status,
      uploadData,
    );
  }

  // 🔗 tạo link
  const linkRes = await fetch(API_SHARE, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ path }),
  });

  let data: any = await linkRes.json();

  // 🔥 nếu link đã tồn tại
  if (data.error?.[".tag"] === "shared_link_already_exists") {
    const listRes = await fetch(API_LIST_LINK, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ path, direct_only: true }),
    });

    const listData: any = await listRes.json();

    if (!listData.links?.length) {
      throw new Error("No shared link found");
    }

    data.url = listData.links[0].url;
  }

  if (!data.url) {
    console.error("❌ Share link error:", data);

    throw new DropboxError("Create shared link failed", 500, data);
  }

  return data.url.replace("?dl=0", "?raw=1");
};

// 📤 Upload nhiều file
export const uploadMultiple = async (
  files: Express.Multer.File[],
  path: string,
) => {
  return Promise.all(
    files.map((file) => {
      const fullPath = `${path}/${Date.now()}_${file.originalname}`;

      return uploadFile(file.buffer, fullPath);
    }),
  );
};

// 📥 List file
export const listFiles = async (folder: string) => {
  const res = await fetch(API_LIST, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ path: folder }),
  });

  return res.json();
};

// ❌ Delete
export const deleteFile = async (path: string) => {
  await fetch(API_DELETE, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ path }),
  });
};

// ✏️ Rename / Move
export const renameFile = async (from: string, to: string) => {
  await fetch(API_MOVE, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      from_path: from,
      to_path: to,
    }),
  });
};

export const listAll = async (path: string) => {
  let entries: any[] = [];

  let res = await fetch(API_LIST, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ path }),
  });

  let data: any = await res.json();

  if (data.error) {
    throw new DropboxError("List folder failed", 500, data);
  }

  entries.push(...data.entries);

  // 🔥 handle has_more
  while (data.has_more) {
    const res2 = await fetch(API_LIST_CONTINUE, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ cursor: data.cursor }),
    });

    data = await res2.json();

    if (data.error) {
      throw new Error("List continue failed");
    }

    entries.push(...data.entries);
  }

  return entries;
};

export const buildTree = async (
  path: string,
  depth = 2, // 🔥 limit để tránh lag
): Promise<TreeNode> => {
  const name = path.split("/").pop() || "root";

  // 👉 nếu depth = 0 → stop recursion
  if (depth === 0) {
    return {
      name,
      path,
      folders: [],
      files: [],
    };
  }

  const entries = await listAll(path);

  const folders = entries.filter((e) => e[".tag"] === "folder");
  const files = entries.filter((e) => e[".tag"] === "file");

  // 🔥 build folder children (recursive)
  const children = await Promise.all(
    folders.map((folder) => buildTree(folder.path_lower, depth - 1)),
  );

  return {
    name,
    path,

    folders: children,

    files: files.map((f) => ({
      name: f.name,
      path: f.path_lower,
      size: f.size,
    })),
  };
};

export const getTreeService = async (path: string) => {
  return buildTree(path, 1);
};
