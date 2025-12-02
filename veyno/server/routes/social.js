// server/routes/social.js
import express from "express";
import { prepareForIG, prepareForTikTok } from "../services/imagePrep.js";
import { uploadBuffer } from "../services/upload.js";
import { publishInstagram } from "../services/instagram.js";
import { publishTikTok, getTikTokStatus, handleTikTokWebhook } from "../services/tiktok.js";
import { validateSafeUrl } from "../utils/validateUrl.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();


// POST /api/social/publish
router.post("/publish", requireAdmin, async (req, res, next) => {
try {
const { platforms = [], caption = "", hashtags = [], images = [] } = req.body;
if (!images?.length) return res.status(400).json({ ok:false, error:"images[] required" });


const fullText = [caption, hashtags?.length ? hashtags.map(h => h.startsWith('#')?h:'#'+h).join(' ') : null]
.filter(Boolean).join('\n\n');


const results = {};


// 1) Preparation and upload to Instagram
if (platforms.includes("instagram")) {
await validateSafeUrl(images[0]);
const igBuf = await prepareForIG(images[0]);
const igUrl = await uploadBuffer(igBuf, { ext:".jpg", prefix:"ig/" });
results.instagram = await publishInstagram({ imageUrl: igUrl, caption: fullText });
}


// 2) Preparation and upload to TikTok
if (platforms.includes("tiktok")) {
const tiktokUrls = [];
for (const src of images) {
const tkBuf = await prepareForTikTok(src);
const tkUrl = await uploadBuffer(tkBuf, { ext:".jpg", prefix:"tiktok/" });
tiktokUrls.push(tkUrl);
}
results.tiktok = await publishTikTok({ imageUrls: tiktokUrls, caption: fullText });
}


res.json({ ok:true, results });
} catch (e) {
next(e);
}
});


// GET /api/social/tiktok/status?id=
router.get("/tiktok/status", requireAdmin, async (req, res, next) => {
try {
const { id } = req.query;
if (!id) return res.status(400).json({ ok:false, error:"id required" });
const data = await getTikTokStatus(id);
res.json({ ok:true, data });
} catch (e) { next(e); }
});


// TikTok webhook (optional) – this should be set as a callback in the dev console
router.post("/tiktok/webhook", async (req, res) => {
await handleTikTokWebhook(req.body);
res.sendStatus(200);
});


export default router;