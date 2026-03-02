import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString(
    "utf-8",
  ),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
