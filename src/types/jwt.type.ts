import { ObjectId } from "mongoose";

export interface IJwtPayload {
  id: ObjectId;
  email: string;
  role: "user" | "admin";
}
