// server/routes/aiMarketing.js
import { Router } from "express";
import {
  generateSocialPost,
  generateImage,
  runwayStart,
  runwayStatus,
  runwayWebhook
} from "../controllers/aiMarketingController.js";

const router = Router();

router.post("/generate-post", generateSocialPost);
router.post("/generate-image", generateImage);

router.post("/video/start", runwayStart);
router.get("/video/status/:id", runwayStatus);

export default router;