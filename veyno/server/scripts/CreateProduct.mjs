// server/createProduct.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";
import fsExtra from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import Product from "./models/Product.js";

// ── .env ───────────────────────────────────────────────────────────────────────
dotenv.config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI / MONGO_URI is missing from .env.");
  process.exit(1);
}
await mongoose.connect(MONGO_URI);
console.log("✅ MongoDB connected");

// ── CWD-independent path to client/public/products ─
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");                 // .../webshop
const CLIENT_PUBLIC_DIR = path.resolve(PROJECT_ROOT, "client", "public");
const PRODUCTS_DIR = path.join(CLIENT_PUBLIC_DIR, "products");
fsExtra.ensureDirSync(PRODUCTS_DIR);
console.log("📁 PRODUCTS_DIR:", PRODUCTS_DIR);

// ── slugging (matching front) ─
function slugifyServer(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const [
  , ,
  ARG_NAME       = "Patterned T-shirt",
  ARG_CATEGORY   = "Shirt",
  ARG_SIZE       = "S, M, L, XL",
  ARG_PRICE      = "30",
  ARG_STOCK      = "10",
  ARG_BRAND      = "Veyno",
  ARG_SKU,
  ARG_IMAGES_CNT = "3",
  ARG_DESC       = "Premium fabric, patterned T-shirt",
] = process.argv;

const price       = Number(ARG_PRICE);
const stock       = Number(ARG_STOCK);
const imagesCount = Math.max(0, Number(ARG_IMAGES_CNT) || 0);

// ──derived fields ─
const categorySlug = slugifyServer(ARG_CATEGORY || "egyeb");
const slug         = slugifyServer(ARG_NAME || "termek");
const imageFolder  = `${categorySlug}/${slug}`;
const images       = Array.from({ length: imagesCount }, (_, i) => `${i + 1}.jpg`);
const now          = new Date();

// ── PAYLOAD – WITH EXACT FIELD ORDER ─
// (MongoDB preserves the field order at the time of insertion)
const payload = {};
payload.sku         = ARG_SKU || `SKU-${slug}-${Date.now()}`;
payload.brand       = ARG_BRAND;
payload.category    = ARG_CATEGORY;
payload.size        = ARG_SIZE;
payload.createdAt   = now;
payload.description = ARG_DESC;
payload.imageFolder = imageFolder;
payload.images      = images;
payload.name        = ARG_NAME;
payload.price       = price;
payload.slug        = slug;
payload.stock       = stock;
payload.updatedAt   = now;

// ── Variants: 10 of each given size ─
// Robust size processing: comma OR whitespace based separation
const sizes = String(ARG_SIZE || "")
  .split(/[,\s]+/)
  .map(s => s.trim())
  .filter(Boolean);

if (sizes.length > 0) {
  payload.variants = sizes.map(sz => ({
    size: sz,
    stock: 10,
    price: payload.price
  }));
  // Total sets = sum of variants (10 * number of sizes)
  payload.stock = payload.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

try {
  // optional: avoid SKU-based duplication
  const existing = await Product.findOne({ sku: ARG_SKU });
  if (existing) {
    console.log(`SKU already exists (${ARG_SKU}), deleting:`, existing._id);
    await Product.findOneAndDelete({ _id: existing._id });
  }

  // insert
  const doc = await Product.create(payload);
  console.log("Created by:", doc._id);

  // filesystem folders (client/public/products/<cat>/<slug>/)
  const absCatDir  = path.join(PRODUCTS_DIR, categorySlug);
  const absProdDir = path.join(absCatDir, slug);
  await fsExtra.ensureDir(absCatDir);
  await fsExtra.ensureDir(absProdDir);

  console.log("Category folder:", absCatDir);
  console.log("Product folder:   ", absProdDir);
  console.log("Pictures:", images.map(f => path.join(imageFolder, f)).join(", "));

} catch (e) {
  console.error("❌ Product creation error:", e?.message || e);
} finally {
  await mongoose.disconnect();
  console.log("MongoDB broken down");
}
