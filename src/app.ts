import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import errorMiddleware from "./middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 API is running");
});

// ✅ Routes
app.use("/api/auth", authRoutes);
// ✅ User
app.use("/api/user", userRoutes);

// ❗ Global error handling middleware
app.use(errorMiddleware);

export default app;
