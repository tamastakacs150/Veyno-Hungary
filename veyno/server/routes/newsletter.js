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
function ensureAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') { 
        return res.status(403).json({ msg: "Access denied. Admins only." });
    }
    next();
}

// Publikus végpontok (bárki elérheti)
router.post("/", subscribe);
router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

// Bejelentkezett felhasználók (bárki, akinek van fiókja)
router.get("/status", authMiddleware, status);

// --- ADMIN VÉGPONTOK ---
// Itt láncoljuk: először authMiddleware (beléptet), utána ensureAdmin (jogosultság)
router.post("/send", authMiddleware, ensureAdmin, sendNewsletter);

// A fájl alapú küldést is érdemes védeni ugyanígy:
router.get("/preview", authMiddleware, ensureAdmin, previewFromFile);
router.post("/send-file", authMiddleware, ensureAdmin, sendFromFile);

export default router;

