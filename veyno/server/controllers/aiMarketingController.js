//server/controllers/aiMarketingController.js
import Product from "../models/Product.js";
import axios from "axios";
import fs from "node:fs/promises";
import { fileURLToPath } from "url";
import path from "node:path";
import mime from "mime";
import { GoogleGenAI } from "@google/genai";
import { validateSafeUrl } from "../utils/validateUrl.js";

const RUNWAY_API = "https://api.dev.runwayml.com/v1";
const RUNWAY_KEY = process.env.RUNWAYML_API_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "client", "public");
const OUT_DIR = path.join(PUBLIC_DIR, "generated");
const publicPath = OUT_DIR;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper for random product selection
async function getRandomProduct() {
    const count = await Product.countDocuments();
    const rand = Math.floor(Math.random() * count);
    const randomProduct = await Product.findOne().skip(rand).lean();
    return randomProduct;
}

export async function generateSocialPost(req, res) {
  try {
    const product = await getRandomProduct();
    if (!product) {
      return res.status(404).json({ error: "No products found to generate content for." });
    }

    const systemPrompt = `
      You are a creative social media marketing assistant for VEYNO, a premium fashion brand.
      Your task is to generate a complete social media post based on the product data provided.
      The post should be engaging, stylish, and encourage clicks and purchases.

      You must provide your response in a clean JSON format with three keys:
      1. "title": A short, catchy title or headline (max 10 words).
      2. "description": A 2-3 sentence description of the product, highlighting its key features and style. Use an elegant and persuasive tone.
      3. "hashtags": An array of 5-7 relevant and trending hashtags, like ["#veyno", "#fashion", "#style", ...].
    `.trim();

    const context = `PRODUCT DATA (JSON):\n${JSON.stringify({
      name: product.name,
      description: product.description || product.shortDescription,
      category: product.category,
      price: product.price,
    })}`;

    const dsResp = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        timeout: 20000,
      }
    );

    const content = dsResp?.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek did not return content.");

    return res.json({
      product,
      post: JSON.parse(content),
    });
  } catch (err) {
    console.error("AI Marketing Post Generation Error:", err?.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to generate social media post." });
  }
}

function isHttpUrl(u = "") {
  return /^https?:\/\//i.test(u);
}

function tryChangeExt(filePath, exts = [".webp", ".png", ".jpg", ".jpeg"]) {
  const parsed = path.parse(filePath);
  const candidates = [];
  if (parsed.ext) candidates.push(filePath);
  for (const ext of exts) {
    candidates.push(path.join(parsed.dir, parsed.name + ext));
  }
  return candidates;
}

async function urlToInlineData(u) {
  // 1) Local public: /products/...
  let pathname = "";
  try {
    pathname = new URL(u, "http://localhost").pathname || "";
  } catch {}

  if (pathname.startsWith("/products/")) {
    const rel = pathname.replace(/^\/+/, "");
    const abs0 = path.join(PUBLIC_DIR, rel);
    const candidates = tryChangeExt(abs0);

    for (const p of candidates) {
      try {
        const buf = await fs.readFile(p);
        const mt = mime.getType(p) || "image/webp";
        console.log("LOCAL REF FOUND:", p);
        return { inlineData: { data: buf.toString("base64"), mimeType: mt } };
      } catch {}
    }

    // if nothing exists, DO NOT try HTTP
    throw new Error(`Local product image not found: ${rel}`);
  }

  // 2) Only for remote HTTP URLs
  if (!/^https?:\/\//i.test(u)) {
    throw new Error(`Unsupported reference path: ${u}`);
  }
  await validateSafeUrl(u);
  const r = await axios.get(u, {
    responseType: "arraybuffer",
     maxContentLength: 5 * 1024 * 1024,
    timeout: 8000
  });
  const ct = (r.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (!ct.startsWith("image/")) {
    throw new Error(`Not an image content-type: ${ct || "unknown"}`);
  }
  return {
    inlineData: {
      data: Buffer.from(r.data).toString("base64"),
      mimeType: ct
    }
  };
}

export async function generateImage(req, res) {
  try {
    const { prompt: userPrompt, productName, productImage, productImages } = req.body || {};
    if (!userPrompt) return res.status(400).json({ error: "Prompt is required." });

    const refUrls = Array.isArray(productImages) && productImages.length
      ? productImages.slice(0, 3)
      : (productImage ? [productImage] : []);

    const parts = [
      {
        text: [
          `Photorealistic fashion marketing image for VEYNO.`,
          `Product: "${productName || "VEYNO T-shirt"}".`,
          `The model is WEARING THE SAME T-SHIRT DESIGN AS THE REFERENCE IMAGE.`,
          `Old-money luxury vibe, tasteful, cinematic lighting.`,
          `Scene/Style: ${userPrompt}`,
        ].join("\n"),
      }
    ];

    for (const u of refUrls) {
      try {
        const p = await urlToInlineData(u);
        if (p?.inlineData?.data) parts.push(p);
      } catch (e) {
        console.warn("Reference skipped:", u, String(e?.message || e));
      }
    }

    // 2) Gemini 2.5 streaming call
    const response = await ai.models.generateContentStream({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
      config: { responseModalities: ["IMAGE", "TEXT"] },
      contents: [{ role: "user", parts }],
    });

    const generatedFiles = [];

    let i = 0;
    for await (const chunk of response) {
      const inline = chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inline?.data) {
        try {
            const ext = mime.getExtension(inline.mimeType || "image/png") || "png";
            await fs.mkdir(OUT_DIR, { recursive: true });
            const filename = `gemini-flash-${Date.now()}-${i++}.${ext}`;
            const filePath = path.join(OUT_DIR, filename);

            await fs.writeFile(filePath, Buffer.from(inline.data, "base64"));
            generatedFiles.push(`/generated/${filename}`);
        } catch (e) {
            console.error("Image saving failed:", e.message);
        }
      }
    }

  if (!generatedFiles.length) {
    return res.status(502).json({ error: "No image returned from Gemini." });
  }

  return res.json({ images: generatedFiles });
    } catch (err) {
  }
}

export async function runwayStart(req, res) {
  try {
    const {
      prompt,
      ratio = "720:1280",     // for 9:16 in new API in resolution ratio: 768:1280 or 1280:768
      model = "veo3",
      seed
    } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt." });

    const r = await axios.post(
      `${RUNWAY_API}/text_to_video`,
      {
        promptText: prompt,
        model,
        ratio,
        duration: 8,
        seed
      },
      {
        headers: {
          "Authorization": `Bearer ${RUNWAY_KEY}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06"
        },
        timeout: 30000
      }
    );

    return res.json({ taskId: r.data?.id, status: r.data?.status || "QUEUED" });
  } catch (e) {
    console.error("runwayStart error:", e?.response?.data || e.message);
    return res.status(500).json({ error: "runway_start_failed", detail: e?.response?.data || e.message });
  }
}

export async function runwayStatus(req, res) {
  try {
    const { id } = req.params;
    const r = await axios.get(`${RUNWAY_API}/tasks/${id}`, {
      headers: {
        "Authorization": `Bearer ${RUNWAY_KEY}`,
        "X-Runway-Version": "2024-11-06"
      },
      timeout: 20000
    });
    return res.json(r.data);
  } catch (e) {
    console.error("runwayStatus error:", e?.response?.data || e.message);
    return res.status(500).json({ error: "runway_status_failed", detail: e?.response?.data || e.message });
  }
}

export async function runwayWebhook(req, res) {
  try {

    const { id, status, output } = req.body || {};

    return res.status(200).send("ok");
  } catch (e) {
    console.error("runwayWebhook error:", e?.message || e);
    return res.status(500).send("fail");
  }
}
