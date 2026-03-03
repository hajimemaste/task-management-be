import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../models/user.model";

(async () => {
  if (!process.env.URL_MONGODB) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(process.env.URL_MONGODB);

  const hash = await bcrypt.hash("12345678", 10);

  await User.create({
    email: "admin@gmail.com",
    password: hash,
    name: "Admin",
    role: "admin",
    provider: "local",
    isEmailVerified: true,
    status: "approved",
  });

  console.log("✅ Admin created!");
  process.exit();
})();
