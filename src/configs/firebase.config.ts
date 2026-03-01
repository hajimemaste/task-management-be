import admin from "firebase-admin";
import path from "path";

const serviceAccount = require(path.resolve("firebase-service-account.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "event-booking-617bf.firebasestorage.app",
  });
}

export const bucket = admin.storage().bucket();
export default admin;
