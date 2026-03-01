import mongoose from "mongoose";

export const connectMongo = async () => {
  try {
    const uri = process.env.URL_MONGODB as string;
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
