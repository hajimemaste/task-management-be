import { Router } from "express";
import {
  login,
  loginWithGoogle,
  refreshAccessToken,
} from "../controllers/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/google", loginWithGoogle);
router.post("/refresh-token", refreshAccessToken);

export default router;
