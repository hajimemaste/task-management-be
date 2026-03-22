import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";
import { initSocket } from "./socket";

import { startTaskCron } from "./cron/task.cron";

import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import dropboxRoutes from "./routes/dropbox.route";
import notificationRoutes from "./routes/notification.route";
import professionalCaseRoutes from "./routes/professionalCase.route";
import autopsyCaseRoutes from "./routes/autopsyCase.router";
import taskRoutes from "./routes/task.route";
import errorMiddleware from "./middlewares/error.middleware";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

startTaskCron();

initSocket(server);

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 API is running");
});

// ✅ Routes
app.use("/api/auth", authRoutes);
// ✅ User
app.use("/api/user", userRoutes);
// ✅ Dropbox
app.use("/api/dropbox", dropboxRoutes);
// ✅ Notification
app.use("/api/notifications", notificationRoutes);
// ✅ Professional
app.use("/api/professional-cases", professionalCaseRoutes);
// ✅ Autopsy
app.use("/api/autopsy-cases", autopsyCaseRoutes);
// ✅ Task
app.use("/api/task", taskRoutes);

// ❗ Global error handling middleware
app.use(errorMiddleware);

export default app;
