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
    throw new Error("Create folder failed");
  }
};

// 🔥 đảm bảo folder tồn tại
export const ensureFolder = async (path: string) => {
  try {
    await createFolderService(path);
  } catch (err) {
    console.log("Folder exists or error:", err);
  }
};

// 📤 Upload 1 file
export const uploadFile = async (
  buffer: Buffer,
  path: string,
  mimetype?: string,
) => {
  // 🔥 đảm bảo folder tồn tại
  const folderPath = path.substring(0, path.lastIndexOf("/"));
  await ensureFolder(folderPath);

  // 🚀 upload
  await fetch(API_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": mimetype || "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
      }),
    },
    body: buffer,
  });

  // 🔗 tạo link
  let linkRes = await fetch(API_SHARE, {
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
    throw new Error("Failed to create shared link");
  }

  return data.url.replace("?dl=0", "?raw=1");
};

// 📤 Upload nhiều file
export const uploadMultiple = async (
  files: Express.Multer.File[],
  userId: string,
) => {
  return Promise.all(
    files.map((file) => {
      const folder = getFolderByMime(file.mimetype);

      const path = `/app/users/${userId}/${folder}/${Date.now()}_${file.originalname}`;

      return uploadFile(file.buffer, path, file.mimetype);
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
