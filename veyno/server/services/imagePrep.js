//server/services/imagePrep.js
import sharp from "sharp";
import axios from "axios";
import { validateSafeUrl } from "../utils/validateUrl.js";

async function fetchBuffer(url) {
  await validateSafeUrl(url); // 🔒 SSRF védelem
  const { data } = await axios.get(url, {
    responseType: "arraybuffer",
    maxContentLength: 5 * 1024 * 1024, // 5 MB limit
    timeout: 8000
  });
  return Buffer.from(data);
}


export async function prepareForIG(srcUrl) {
const buf = await fetchBuffer(srcUrl);
// IG recommended: 1080×1080 JPG, good quality, <= ~8MB
return await sharp(buf)
.resize(1080, 1080, { fit: "cover" })
.jpeg({ quality: 88 })
.toBuffer();
}


export async function prepareForTikTok(srcUrl) {
const buf = await fetchBuffer(srcUrl);
// TikTok photo post: flexible, leave it at 1080×1080
return await sharp(buf)
.resize(1080, 1080, { fit: "contain", background: { r:0, g:0, b:0, alpha:1 } })
.jpeg({ quality: 88 })
.toBuffer();
}