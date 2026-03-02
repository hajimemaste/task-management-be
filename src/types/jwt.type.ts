import { ObjectId } from "mongoose";

export interface AuthTokenPayload {
  id: ObjectId;
  email: string;
  role: "user" | "admin";
}
