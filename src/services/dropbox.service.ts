import { DropboxError } from "../utils/dropboxError";
import { TreeNode } from "../interfaces/dropbox.interface";
import fetch from "node-fetch";

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

const getHeaders = async () => {
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};
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
  const res = await fetchWithRetry(API_CREATE_FOLDER, {
    method: "POST",
    headers: await getHeaders(),
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
    await createFolderService(path);
  } catch (err) {
    console.log("Folder exists or error:", err);
  }
};

// 📤 Upload 1 file
export const uploadFile = async (buffer: Buffer, path: string) => {
  // 🔥 đảm bảo folder tồn tại
  const folderPath = path.substring(0, path.lastIndexOf("/"));
  await ensureFolder(folderPath);

  // 🚀 upload
  const token = await getAccessToken();

  const uploadRes = await fetchWithRetry(API_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
      }),
    },
    body: buffer,
  });

  const uploadData: any = await uploadRes.json();

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
  const linkRes = await fetchWithRetry(API_SHARE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path }),
  });

  let data: any = await linkRes.json();

  // 🔥 nếu link đã tồn tại
  if (data.error?.[".tag"] === "shared_link_already_exists") {
    const listRes = await fetchWithRetry(API_LIST_LINK, {
      method: "POST",
      headers: await getHeaders(),
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
  const res = await fetchWithRetry(API_LIST, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path: folder }),
  });

  return res.json();
};

// ❌ Delete
export const deleteFile = async (path: string) => {
  await fetchWithRetry(API_DELETE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path }),
  });
};

// ✏️ Rename / Move
export const renameFile = async (from: string, to: string) => {
  await fetchWithRetry(API_MOVE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({
      from_path: from,
      to_path: to,
    }),
  });
};

const getSharedLink = async (path: string) => {
  const listRes = await fetchWithRetry(API_LIST_LINK, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path, direct_only: true }),
  });

  const listData: any = await listRes.json();

  if (listData.links?.length) {
    return normalizeDropboxUrl(listData.links[0].url);
  }

  const createRes = await fetchWithRetry(API_SHARE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path }),
  });

  const createData: any = await createRes.json();

  if (!createData.url) {
    throw new DropboxError("Create shared link failed", 500, createData);
  }

  return normalizeDropboxUrl(createData.url);
};

const getMimeType = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();

  if (!ext) return "file";

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";

  return "file";
};

const normalizeDropboxUrl = (url: string) => {
  return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
};

export const listAll = async (path: string) => {
  if (!path) return [];

  let entries: any[] = [];

  try {
    const res = await fetchWithRetry(API_LIST, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ path }),
    });

    const text = await res.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ Dropbox non-JSON response:", text);
      return [];
    }

    // 👉 folder chưa tồn tại → OK
    if (
      data?.error?.error_summary?.includes("path/not_found") ||
      data?.error?.[".tag"] === "path"
    ) {
      return [];
    }

    // 👉 lỗi khác → log nhưng KHÔNG crash
    if (data.error) {
      console.warn("⚠️ Dropbox list error:", data);
      return [];
    }

    entries.push(...(data.entries || []));

    // =========================
    // 🔁 CONTINUE
    // =========================

    while (data.has_more) {
      const res2 = await fetchWithRetry(API_LIST_CONTINUE, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({ cursor: data.cursor }),
      });

      let nextData: any;

      try {
        nextData = await res2.json();
      } catch {
        console.warn("⚠️ Invalid continue response");
        break;
      }

      if (nextData.error) {
        console.warn("⚠️ List continue error:", nextData);
        break;
      }

      entries.push(...(nextData.entries || []));
      data = nextData;
    }

    // =========================
    // 🔥 MAP FILE
    // =========================

    const files = await Promise.all(
      entries
        .filter((e) => e[".tag"] === "file")
        .map(async (f) => {
          try {
            const url = await getSharedLink(f.path_lower);

            return {
              name: f.name,
              path: f.path_lower,
              size: f.size,
              mimeType: getMimeType(f.name),
              url,
            };
          } catch (err) {
            console.warn("⚠️ getSharedLink fail:", f.path_lower);
            return null;
          }
        }),
    );

    return files.filter(Boolean);
  } catch (err) {
    console.error("❌ listAll crash:", err);
    return [];
  }
};

export const deleteFolder = async (path: string) => {
  if (!path) return;

  const safePath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetchWithRetry(API_DELETE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ path: safePath }),
  });

  const data: any = await res.json();

  // 👉 nếu folder không tồn tại → bỏ qua luôn (tránh crash)
  if (data.error?.[".tag"] === "path_lookup") {
    console.log("⚠️ Folder không tồn tại:", safePath);
    return;
  }

  if (!res.ok) {
    console.error("❌ Delete folder error:", data);
    throw new DropboxError("Delete folder failed", 500, data);
  }
};

export const renameFolderService = async (fromPath: string, toPath: string) => {
  if (!fromPath || !toPath) return;

  // 👉 normalize path
  const from = fromPath.startsWith("/") ? fromPath : `/${fromPath}`;
  const to = toPath.startsWith("/") ? toPath : `/${toPath}`;

  // 👉 nếu giống nhau thì skip
  if (from === to) return;

  const res = await fetchWithRetry(API_MOVE, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({
      from_path: from,
      to_path: to,
      autorename: false,
    }),
  });

  const data: any = await res.json();

  // ❗ nếu folder không tồn tại → bỏ qua (không crash)
  if (data.error?.[".tag"] === "from_lookup") {
    console.warn("⚠️ Folder không tồn tại:", from);
    return;
  }

  // ❗ nếu trùng tên → báo lỗi rõ ràng
  if (
    data.error?.[".tag"] === "to" &&
    data.error?.to?.[".tag"] === "conflict"
  ) {
    throw new DropboxError("Folder đích đã tồn tại", 400, data);
  }

  if (!res.ok) {
    console.error("❌ Rename folder error:", data);
    throw new DropboxError("Rename folder failed", res.status, data);
  }

  return true;
};

export const refreshAccessToken = async () => {
  const res = await fetchWithRetry("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
  });

  const data: any = await res.json();

  if (!data.access_token) {
    throw new Error("Refresh token failed");
  }

  return data;
};

let accessToken: string | null = null;
let expiredAt = 0;

export const getAccessToken = async () => {
  if (accessToken && Date.now() < expiredAt) {
    return accessToken;
  }

  const data = await refreshAccessToken();

  accessToken = data.access_token;
  expiredAt = Date.now() + (data.expires_in - 60) * 1000;

  return accessToken;
};

const buildOptions = async (token: string, options: any) => ({
  ...options,
  headers: {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  },
});

const fetchWithRetry = async (url: string, options: any) => {
  let token = await getAccessToken();

  let res = await fetch(url, await buildOptions(token!, options));

  if (res.status === 401) {
    accessToken = null;

    token = await getAccessToken();

    // 🔥 rebuild request (QUAN TRỌNG)
    res = await fetch(url, await buildOptions(token!, options));

    if (res.status === 401) {
      const text = await res.text();
      console.error("❌ Dropbox 401 after retry:", text);
      throw new Error("Dropbox auth failed after retry");
    }
  }

  return res;
};
