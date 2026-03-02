import { AuthTokenPayload } from "./jwt.type";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthTokenPayload;
  }
}
