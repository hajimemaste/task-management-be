import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString(
    "utf-8",
  ),
);

// 🔥 FIX 1: sửa private key
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

// 🔥 FIX 2: chỉ init 1 lần
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const bucket = admin.storage().bucket();
export default admin;
