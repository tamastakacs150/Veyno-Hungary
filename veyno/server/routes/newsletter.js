// server/routes/newsletter.js
import { Router } from "express";
import NewsletterLog from "../models/NewsletterLog.js";
import { authMiddleware } from "../middleware/auth.js";
import {
    subscribe,
    listAll,
    sendNewsletter,
    previewFromFile,
    sendFromFile,
    status,
    unsubscribe,
} from "../controllers/newsletterController.js";

const router = Router();

// 1x1 GIF bits (fixed content)
const GIF_BYTES = Buffer.from(
  "47494638396101000100910000ffffff00000021f90401000001002c00000000010001000002024401003b",
  "hex"
);

router.get("/open/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id && id.length === 24) {
      await NewsletterLog.findByIdAndUpdate(id, { $push: { opens: new Date() } });
    }
  } catch {}
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return res.end(GIF_BYTES);
});

// Simple admin protection: X-Newsletter-Token header
function requireNewsletterAdmin(req, res, next) {
    const t = req.headers["x-newsletter-token"];
    if (t && process.env.NEWSLETTER_ADMIN_TOKEN && t === process.env.NEWSLETTER_ADMIN_TOKEN) return next();
    return res.status(401).json({ msg: "Unauthorized" });
}

// Subscribe + list
router.post("/", subscribe);     // POST /api/newsletter
//router.get("/", requireNewsletterAdmin, listAll);   // GET  /api/newsletter
router.get("/status", authMiddleware, status);   // GET  /api/newsletter/status?email=...

// Manual sending from body (subject + html/text)
router.post("/send", requireNewsletterAdmin, sendNewsletter);

// from preview file (admin only)
router.get("/preview", requireNewsletterAdmin, previewFromFile);

// send from file (admin only)
router.post("/send-file", requireNewsletterAdmin, sendFromFile);

//Unsubscribe
router.get("/unsubscribe", unsubscribe); // GET /api/newsletter/unsubscribe
router.post("/unsubscribe", unsubscribe); // POST /api/newsletter/unsubscribe

export default router;

