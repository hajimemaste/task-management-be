import { AuthTokenPayload } from "./jwt.type";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthTokenPayload;

    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}
