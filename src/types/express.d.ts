import type { IJwtPayload } from "./jwt.type";

declare module "express-serve-static-core" {
  interface Request {
    user: IJwtPayload;
  }
}

export {};
