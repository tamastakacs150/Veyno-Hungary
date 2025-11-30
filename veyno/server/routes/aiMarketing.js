// server/routes/aiMarketing.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  generateSocialPost,
  generateImage,
  runwayStart,
  runwayStatus,
  runwayWebhook
} from "../controllers/aiMarketingController.js";

const router = Router();

router.post("/generate-post", requireAdmin, generateSocialPost);
router.post("/generate-image", requireAdmin, generateImage);
router.post("/video/start", requireAdmin, runwayStart);
router.get("/video/status/:id", requireAdmin, runwayStatus);

export default router;