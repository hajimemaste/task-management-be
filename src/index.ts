import { connectMongo } from "./configs/mongo.config";
import { server } from "./app";
import dotenv from "dotenv";
import { startTaskCron } from "./cron/task.cron";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;

const startServer = async () => {
  await connectMongo();

  startTaskCron();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
