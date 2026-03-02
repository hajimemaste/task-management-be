import { connectMongo } from "./configs/mongo.config";
import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;

const startServer = async () => {
  await connectMongo();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
