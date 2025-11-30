// server/routes/admin.js
import express from "express";
import multer from "multer";
import sharp from "sharp";
import fsExtra from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";
import Newsletter from "../models/Newsletter.js";
import NewsletterLog from "../models/NewsletterLog.js";
import ContactMessage from "../models/ContactMessage.js";
import EmailLog from "../models/EmailLog.js";
import Coupon from "../models/Coupon.js";
import { sendCustomEmail, buildCustomEmailHtml, sendReplyEmail } from "../mailer/mailer.js";

const router = express.Router();

/* ----------------------------------------------------------------------------
* Image Upload Settings (Products)
* --------------------------------------------------------------------------*/

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ROOT_DIR    = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR  = path.join(ROOT_DIR, "client", "public");
const PRODUCTS_DIR = path.join(PUBLIC_DIR, "products");

const allowedMimes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) return cb(null, true);
    if (file.mimetype?.startsWith?.("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
  limits: { files: 5, fileSize: 10 * 1024 * 1024 }, // max 5 images, 10MB/image
});

function slugifyServer(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productFolderParts(doc = {}) {
  const catSlug = slugifyServer(doc.category || "egyeb");
  const nameSlug = slugifyServer(
    doc.name || doc.title || doc.sku || String(doc._id || "termek")
  );
  const absCatDir = path.join(PRODUCTS_DIR, catSlug);
  const absProdDir = path.join(absCatDir, nameSlug);
  return { catSlug, nameSlug, absCatDir, absProdDir };
}

/* ------------------------------------------------------------------------------------
 * Users (for Dashboard stats)
 * -----------------------------------------------------------------------------*/
router.get("/users", async (_req, res) => {
  try {
    const users = await User.find({})
      .select("_id name email role createdAt")
      .sort({ createdAt: -1 })
      .limit(1000);
    res.json(users);
  } catch (e) {
    console.error("ADMIN users list error:", e);
    res.status(500).json({ error: "Users fetch failed." });
  }
});

/* ----------------------------------------------------------------------------
 * Orders
 * --------------------------------------------------------------------------*/
router.get("/orders", async (_req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate("items.productId");
    res.json(orders);
  } catch (e) {
    console.error("ADMIN orders list error:", e);
    res.status(500).json({ error: "Orders fetch failed." });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};
    const valid = [
      "pending",
      "paid",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const upd = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!upd) return res.status(404).json({ error: "Order not found." });
    res.json(upd);
  } catch (e) {
    console.error("ADMIN order status error:", e);
    res.status(500).json({ error: "Order status update failed." });
  }
});

/* ----------------------------------------------------------------------------
 * Products
 * --------------------------------------------------------------------------*/

// LIST with dual-mode: paginated (default) or flat (Home-compatible)
router.get("/products", async (req, res) => {
  try {
    const {
      fields = "_id name price category brand stock sale images image imageFolder slug createdAt updatedAt",
      limit = "30",
      skip = "0",
      q = "",
      flat = "0",
    } = req.query;

    const query = {};
    if (q && String(q).trim()) {
      query.name = { $regex: String(q).trim(), $options: "i" };
    }

    const projection = {};
    String(fields).split(",").map(f => f.trim()).filter(Boolean).forEach(f => (projection[f] = 1));

    const lim = Math.max(0, Math.min(200, Number(limit) || 30));
    const skp = Math.max(0, Number(skip) || 0);

    const docs = await Product.find(query, projection)
      .skip(flat === "1" ? 0 : skp)
      .limit(flat === "1" ? 10000 : lim)
      .sort({ updatedAt: -1 })
      .lean();

    const normalized = docs.map((p) => {
      const name = p.name || p.title || p.sku || String(p._id);
      const cat = p.category || "egyeb";
      const slug = p.slug || slugifyServer(name);
      const imageFolder =
        (p.imageFolder && String(p.imageFolder).trim()) ||
        `${slugifyServer(cat)}/${slug}`;

      // at least 1 image filename – client uses /products/<folder>/<index>.webp scheme
      const images = Array.isArray(p.images) && p.images.length
        ? p.images
        : [ "1.webp" ];

      // calculate the discount net price (if needed by Home)
      let effectivePrice = Number(p.price || 0);
      if (p?.sale?.active) {
        const type = p.sale.type === "amount" ? "amount" : "percent";
        const v = Number(p.sale.value || 0);
        effectivePrice = type === "amount"
          ? Math.max(0, effectivePrice - v)
          : Math.max(0, Math.round(effectivePrice * (1 - v / 100)));
      }

      return { ...p, slug, imageFolder, images, effectivePrice };
    });

    if (flat === "1") return res.json(normalized);
    const total = await Product.countDocuments(query);
    res.json({ items: normalized, total });
  } catch (e) {
    console.error("GET /api/admin/products error:", e);
    res.status(500).json({ error: "Failed to load products" });
  }
});

/* Helper: sizes JSON -> variants array (S/M/L/XL), and total */
function sizesToVariantsAndTotal(sizesRaw, fallbackStock) {
  let sizes = null;
  try {
    sizes = sizesRaw ? JSON.parse(sizesRaw) : null;
  } catch {}
  if (!sizes || typeof sizes !== "object") {
    const total = Math.max(0, Number(fallbackStock || 0));
    return { variants: [], total };
  }
  const entries = [
    ["S", sizes.S],
    ["M", sizes.M],
    ["L", sizes.L],
    ["XL", sizes.XL],
  ];
  const variants = entries
    .map(([size, qty]) => ({ size, stock: Math.max(0, Number(qty || 0)) }))
    .filter((v) => Number.isFinite(v.stock) && v.stock >= 0);
  const total = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  return { variants, total };
}

// CREATE (images → 1.webp..5.webp) — slug, imageFolder, brand FORWARD + VARIANTS
router.post("/products", upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      price,
      category,
      stock,
      sku,
      brand,
      sizes: sizesRaw,
    } = req.body || {};
    const baseName = name || title;

    // missing fields: 0 value accepted
    const missing = [baseName, description, price, category, stock].some(
      (v) =>
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "")
    );
    if (missing) {
      return res.status(400).json({
        error: "Missing fields (name/description/price/category/stock)!",
      });
    }

    // sizes -> variants + total stock synchronous
    const { variants, total } = sizesToVariantsAndTotal(sizesRaw, stock);
    const totalStock = variants.length ? total : Math.max(0, Number(stock || 0));

    // slugs + folders FORWARD
    const catSlug = slugifyServer(category);
    const nameSlug = slugifyServer(baseName);
    const imageFolder = `${catSlug}/${nameSlug}`;

    const absCatDir = path.join(PRODUCTS_DIR, catSlug);
    const absProdDir = path.join(absCatDir, nameSlug);
    await fsExtra.ensureDir(absCatDir);
    await fsExtra.ensureDir(absProdDir);

    // images → 1.webp, 5.webp (selection order)
    const files = (req.files || []).slice(0, 5);
    const saved = [];
    for (let i = 0; i < files.length; i++) {
      const idx = i + 1;
      const outPath = path.join(absProdDir, `${idx}.webp`);
      await sharp(files[i].buffer).rotate().webp({ quality: 86 }).toFile(outPath);
      saved.push(`${idx}.webp`);
    }

    // CREATE DB document with mandatory fields
    const now = new Date();
    const doc = await Product.create({
      name: baseName,
      slug: nameSlug,
      description,
      price: Number(price),
      category,
      stock: Number(totalStock),
      sku: sku || `SKU-${Date.now()}`,
      brand: brand && String(brand).trim() ? brand : "Generic",
      brand: brand?.trim() || "Veyno",
      imageFolder,
      images: saved,
      variants: variants.length ? variants : undefined,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error("ADMIN create product error:", e);
    res.status(500).json({ error: "Product create failed." });
  }
});

// UPDATE — slug/imageFolder updated + VARIANTS update + image folder rename
router.put("/products/:id", upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, title, description, price, category, stock, sku, brand, sizes: sizesRaw,
    } = req.body || {};

    const doc = await Product.findById(id);
    if (!doc) return res.status(404).json({ error: "Product not found" });

    // --- 1) SAVE old values ​​(before modification!)
    const originalName = doc.name;
    const originalCategory = doc.category;

    // Old path: 1) from existing imageFolder, 2) fallback from old slugs
    const oldFromFolder = doc.imageFolder
      ? path.join(PRODUCTS_DIR, doc.imageFolder)
      : null;
    const oldCatSlug = slugifyServer(originalCategory);
    const oldNameSlug = slugifyServer(originalName);
    const oldFromSlugs = path.join(PRODUCTS_DIR, oldCatSlug, oldNameSlug);
    const prevAbsProdDir = oldFromFolder || oldFromSlugs;

    // --- 2) UPDATE Doc fields based on the request
    if (name || title) {
      const newName = name || title;
      doc.name = newName;
      doc.slug = slugifyServer(newName);
    }
    if (description != null) doc.description = description;
    if (price != null) doc.price = Number(price);
    if (category) doc.category = category;
    if (sku) doc.sku = sku;
    if (brand != null) doc.brand = String(brand).trim() || "Generic";

    // sizes -> variants + total sync
    const { variants, total } = sizesToVariantsAndTotal(sizesRaw, stock);
    const sizesProvided = typeof sizesRaw !== "undefined";
    if (sizesProvided) {
      doc.variants = variants.length ? variants : [];
      doc.stock = variants.length ? total : Math.max(0, Number(stock ?? doc.stock));
    } else if (stock != null) {
      doc.stock = Math.max(0, Number(stock));
    }

    // --- 3) NEW folder path based on NEW doc
    const newCatSlug = slugifyServer(doc.category);
    const newNameSlug = slugifyServer(doc.name);
    const absCatDir = path.join(PRODUCTS_DIR, newCatSlug);
    const absProdDir = path.join(absCatDir, newNameSlug);
    await fsExtra.ensureDir(absCatDir);

    // --- 4) If the path has changed and the old folder exists → MOVE
    if (prevAbsProdDir !== absProdDir && await fsExtra.pathExists(prevAbsProdDir)) {
      try {
        await fsExtra.move(prevAbsProdDir, absProdDir, { overwrite: true });
        console.log(`Moved product folder: ${prevAbsProdDir} → ${absProdDir}`);
      } catch (err) {
        console.warn("Folder move failed, fallback:", err.message);
        await fsExtra.ensureDir(absProdDir);
      }
    } else {
      // if there is no old folder, at least have the new one
      await fsExtra.ensureDir(absProdDir);
    }

    // --- 5) Image exchange (if new file arrived)
    const files = (req.files || []).slice(0, 5);
    if (files.length) {
      const all = await fsExtra.readdir(absProdDir).catch(() => []);
      await Promise.all(
        all
          .filter((f) => /^\d+\.(webp|jpg|jpeg|png)$/i.test(f))
          .map((f) => fsExtra.remove(path.join(absProdDir, f)))
      );

      const saved = [];
      for (let i = 0; i < files.length; i++) {
        const idx = i + 1;
        const outPath = path.join(absProdDir, `${idx}.webp`);
        await sharp(files[i].buffer).rotate().webp({ quality: 86 }).toFile(outPath);
        saved.push(`${idx}.webp`);
      }
      doc.images = saved;
    }

    // --- 6) imageFolder SYNCHRONIZED with new slugs
    doc.imageFolder = `${newCatSlug}/${newNameSlug}`;
    doc.updatedAt = new Date();
    await doc.save();

    // (optional) delete old folder if it was left empty and different
    if (prevAbsProdDir !== absProdDir) {
      try {
        const rest = await fsExtra.readdir(prevAbsProdDir);
        if (!rest || rest.length === 0) await fsExtra.remove(prevAbsProdDir);
      } catch {}
    }

    return res.json(doc);
  } catch (err) {
    console.error("PUT /products/:id error:", err);
    return res.status(500).json({ error: "Product update failed" });
  }
});

// DELETE — delete product + image folder
router.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Product.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Product not found" });

    // folder path: imageFolder if available, otherwise based on category/name slug
    const catSlug = slugifyServer(doc.category || "egyeb");
    const nameSlug = slugifyServer(doc.name || doc.slug || String(doc._id));
    const folder = doc.imageFolder && String(doc.imageFolder).trim()
      ? path.join(PRODUCTS_DIR, doc.imageFolder)
      : path.join(PRODUCTS_DIR, catSlug, nameSlug);

    // delete image folder (if it exists)
    try { await fsExtra.remove(folder); } catch {}

    // delete product from database
    await Product.findByIdAndDelete(id);

    return res.json({ ok: true });
  } catch (e) {
    console.error("ADMIN delete product error:", e);
    return res.status(500).json({ error: "Product delete failed." });
  }
});

/// --- SALES 

// LIST: only actions ACTIVE IN TIME (now <= endAt, and startAt <= now)
router.get("/sales", async (_req, res) => {
  try {
    const now = new Date();
    const docs = await Product.find(
      {
        "sale.active": true,
        $and: [
          { $or: [{ "sale.startAt": { $exists: false } }, { "sale.startAt": { $lte: now } }] },
          { $or: [{ "sale.endAt": { $exists: false } }, { "sale.endAt": { $gte: now } }] },
        ],
      },
      {
        name: 1,
        price: 1,
        category: 1,
        slug: 1,
        imageFolder: 1,
        images: 1,
        "sale.type": 1,
        "sale.value": 1,
        "sale.label": 1,
        "sale.startAt": 1,
        "sale.endAt": 1,
      }
    )
      .sort({ updatedAt: -1 })
      .lean();

    const items = docs.map((d) => {
      const name = d.name || d.title || d.sku || String(d._id);
      const cat = d.category || "egyeb";
      const slug = d.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const imageFolder =
        (d.imageFolder && String(d.imageFolder).trim()) || `${cat}/${slug}`;

      return {
        productId: String(d._id),
        name: d.name,
        basePrice: d.price,
        discountType: d.sale?.type === "amount" ? "amount" : "percent",
        discountValue: Number(d.sale?.value || 0),
        label: d.sale?.label || "",
        startDate: d.sale?.startAt
          ? new Date(d.sale.startAt).toISOString().slice(0, 10)
          : "",
        endDate: d.sale?.endAt
          ? new Date(d.sale.endAt).toISOString().slice(0, 10)
          : "",
        imageFolder,
        images: Array.isArray(d.images) ? d.images : [],
        slug,
        active: true,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error("GET /api/admin/sales error:", e);
    res.status(500).json({ error: "Failed to load sales." });
  }
});

// SET: a product sale (with the logic of set-sale.mjs)
router.post("/sales/set", async (req, res) => {
  try {
    const { productId, type = "percent", value, label = "", start, end } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const TYPE = String(type).toLowerCase(); // 'percent' | 'amount'
    if (!["percent", "amount"].includes(TYPE)) {
      return res.status(400).json({ error: "type must be 'percent' or 'amount'" });
    }
    const VALUE = Number(value);
    if (!Number.isFinite(VALUE) || VALUE < 0) {
      return res.status(400).json({ error: "value must be a non-negative number" });
    }

    const START = start ? new Date(start) : null;
    const END = end ? new Date(end) : null;
    if (START && isNaN(START.getTime())) return res.status(400).json({ error: "start is not a valid date" });
    if (END && isNaN(END.getTime())) return res.status(400).json({ error: "end is not a valid date" });
    if (START && END && START > END) return res.status(400).json({ error: "start cannot be after end" });

    const update = {
      "sale.active": true,
      "sale.type": TYPE,
      "sale.value": VALUE,
      "sale.label": String(label || ""),
      "sale.startAt": START,
      "sale.endAt": END,
    };

    const doc = await Product.findByIdAndUpdate(productId, { $set: update }, { new: true });
    if (!doc) return res.status(404).json({ error: "Product not found" });

    res.json({ ok: true, productId: String(doc._id) });
  } catch (e) {
    console.error("POST /api/admin/sales/set error:", e);
    res.status(500).json({ error: "Failed to set sale." });
  }
});

// DELETE: delete a product's sale (clear-sale.mjs logic)
router.post("/sales/clear", async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const update = {
      "sale.active": false,
      "sale.type": "percent",
      "sale.value": 0,
      "sale.label": "",
      "sale.startAt": null,
      "sale.endAt": null,
    };

    const doc = await Product.findByIdAndUpdate(productId, { $set: update }, { new: true });
    if (!doc) return res.status(404).json({ error: "Product not found" });

    res.json({ ok: true, productId: String(doc._id) });
  } catch (e) {
    console.error("POST /api/admin/sales/clear error:", e);
    res.status(500).json({ error: "Failed to clear sale." });
  }
});

// --- NEWSLETTER (real stats + real sending) ---

// Summary stats (from Newsletter collection)
router.get("/newsletter/stats", async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments();

    // Sent this month (sent – ​​NOT the same as delivered!)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sentThisMonth = await NewsletterLog.countDocuments({
      sentAt: { $gte: monthStart, $lte: now },
    });

    // Open rate (last 30 days aggregated)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lastLogs = await NewsletterLog.find({ sentAt: { $gte: since } }, { opens: 1 }).lean();
    const totalSent = lastLogs.length;
    const openedAtLeastOnce = lastLogs.filter(l => (l.opens?.length || 0) > 0).length;
    const avgOpenRate = totalSent ? Math.round((openedAtLeastOnce / totalSent) * 100) : 0;

    res.json({ totalSubscribers, sentThisMonth, avgOpenRate });
  } catch (e) {
    console.error("newsletter stats error:", e);
    res.status(500).json({ error: "Newsletter stats failed." });
  }
});

router.post("/newsletter/send", async (req, res) => {
  try {
    const { subject, html, text, campaignId } = req.body || {};
    if (!subject || (!html && !text)) {
      return res.status(400).json({ error: "subject and html/text are required" });
    }

    // Retrieve and clean up subscribers
    const subs = await Newsletter.find().select("email -_id").lean();
    const recipients = [...new Set(
      subs.map(s => String(s.email || "").trim().toLowerCase())
    )].filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (!recipients.length) {
      return res.json({ ok: true, sent: 0, fail: 0, total: 0 });
    }

    // Public origin for the tracking pixel (e.g. https://mydomain.com)
    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

    // SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === "true" || Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    let sent = 0, fail = 0;

    // Per-addressee sending: unique tracking pixel + log
    for (const email of recipients) {
      // 1) log entry
      const log = await NewsletterLog.create({ to: email, subject, campaignId });

      // 2) unique pixel (HTML only)
      const pixel = html
        ? `<img src="${base}/api/newsletter/open/${log._id}" width="1" height="1" style="display:none" alt="">`
        : "";

      // 3) insert pixel (if there is no </body></html>, simply append it)
      const htmlWithPixel = html
        ? (html.replace(/<\/body>\s*<\/html>\s*$/i, `${pixel}</body></html>`) || (html + pixel))
        : undefined;

      try {
        await transporter.sendMail({
          from: `"${process.env.MAIL_FROM_NAME || "VEYNO"}" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
          to: email,
          subject,
          ...(htmlWithPixel ? { html: htmlWithPixel } : {}),
          ...(text ? { text } : {}),
        });
        sent++;
      } catch (err) {
        console.error("Send fail:", email, err?.message);
        fail++;
      }
    }

    return res.json({ ok: true, sent, fail, total: recipients.length });
  } catch (e) {
    console.error("ADMIN newsletter send error:", e);
    res.status(500).json({ error: "Newsletter send failed." });
  }
});

// --- CUSTOMER LIST (ORDERERS) ---
router.get("/customers", async (_req, res) => {
  try {
    // only the required fields – and search for the name/email in multiple possible places
    const orders = await Order.find({}, "createdAt customer user email name")
      .sort({ createdAt: -1 })
      .lean();

    const byEmail = new Map(); // key: email lower-case

    for (const o of orders) {
      const email =
        (o?.customer && o.customer.email) ||
        (o?.user && o.user.email) ||
        o?.email ||
        "";

      const name =
        (o?.customer && o.customer.name) ||
        (o?.user && o.user.name) ||
        o?.name ||
        (email ? String(email).split("@")[0] : "");

      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) continue;

      const existed = byEmail.get(cleanEmail);
      // the first (most recent) order will be the "freshest" - because the request is decreasing according to createdAt
      if (!existed) {
        byEmail.set(cleanEmail, {
          id: cleanEmail,      // simple: the email will be the identifier
          name: name || cleanEmail.split("@")[0],
          email: cleanEmail,
          lastOrderAt: o.createdAt,
        });
      }
    }

    // convert to array + (optional) sort by time
    const customers = Array.from(byEmail.values()).sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime()
    ).map(({ lastOrderAt, ...rest }) => rest);

    return res.json({ customers });
  } catch (e) {
    console.error("admin/customers (from orders) error:", e);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

// --- SEND A PERSONAL EMAIL ---
router.post("/email/custom", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body || {};
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: "to, subject and html/text are required" });
    }

    // actual sending with the mailer
    await sendCustomEmail({ to, subject, html: html || undefined });
    // log
    await EmailLog.create({
      to: String(to).toLowerCase().trim(),
      subject,
      html: html || "",
      text: text || "",
      context: "custom",
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("admin/email/custom error:", e);
    res.status(500).json({ error: "Failed to send custom email" });
  }
});

// Preview generated HTML for custom emails (exact same template as sending)
router.post("/email/custom/preview", async (req, res) => {
  try {
    const { subject = "", html = "", text = "" } = req.body || {};
    const doc = buildCustomEmailHtml({ subject, html, text });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(doc);
  } catch (e) {
    console.error("custom email preview error:", e);
    return res.status(500).json({ error: "Preview failed" });
  }
});

// --- LATEST UNIQUE EMAILS ---
router.get("/email/recent", async (_req, res) => {
  try {
    const recent = await EmailLog.find({ context: "custom" })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("to subject createdAt")
      .lean();

    const items = recent.map(r => ({
      to: r.to,
      subject: r.subject || "(no subject)",
      date: r.createdAt,
    }));

    res.json({ items });
  } catch (e) {
    console.error("admin/email/recent error:", e);
    res.status(500).json({ error: "Failed to load recent emails" });
  }
});

// LIST
router.get("/coupons", async (_req, res) => {
  try {
    const items = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) {
    console.error("GET /api/admin/coupons error:", e);
    res.status(500).json({ error: "Failed to load coupons" });
  }
});

// CREATE
router.post("/coupons", async (req, res) => {
  try {
    const {
      code, discountType, discountValue,
      startDate, endDate, minPurchase = 0, maxUses = 0
    } = req.body || {};

    if (!code || !discountType || discountValue == null) {
      return res.status(400).json({ error: "code, discountType, discountValue required" });
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ error: "discountType must be 'percentage' or 'fixed'" });
    }

    const doc = await Coupon.create({
      code: String(code).toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      minPurchase: Number(minPurchase || 0),
      maxUses: Number(maxUses || 0),
      currentUses: 0,
      active: true,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error("POST /api/admin/coupons error:", e);
    // unique code in case of collision
    if (e?.code === 11000) return res.status(409).json({ error: "Coupon code already exists" });
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

// UPDATE
router.put("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, discountType, discountValue,
      startDate, endDate, minPurchase = 0, maxUses = 0
    } = req.body || {};

    if (discountType && !["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ error: "discountType must be 'percentage' or 'fixed'" });
    }

    const upd = await Coupon.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(code ? { code: String(code).toUpperCase().trim() } : {}),
          ...(discountType ? { discountType } : {}),
          ...(discountValue != null ? { discountValue: Number(discountValue) } : {}),
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          minPurchase: Number(minPurchase || 0),
          maxUses: Number(maxUses || 0),
        },
      },
      { new: true }
    );
    if (!upd) return res.status(404).json({ error: "Coupon not found" });
    res.json(upd);
  } catch (e) {
    console.error("PUT /api/admin/coupons/:id error:", e);
    if (e?.code === 11000) return res.status(409).json({ error: "Coupon code already exists" });
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

// TOGGLE ACTIVE
router.patch("/coupons/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Coupon.findById(id);
    if (!doc) return res.status(404).json({ error: "Coupon not found" });
    doc.active = !doc.active;
    await doc.save();
    res.json({ ok: true, active: doc.active });
  } catch (e) {
    console.error("PATCH /api/admin/coupons/:id/toggle error:", e);
    res.status(500).json({ error: "Failed to toggle coupon" });
  }
});

// DELETE
router.delete("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Coupon.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ error: "Coupon not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/coupons/:id error:", e);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// NEW: Reply to a message
router.post('/messages/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;
    if (!replyText) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    // Send email to user
    await sendReplyEmail({
      to: message.email,
      name: message.name,
      replyText,
      originalMessage: message.message,
    });

    // Update status
    message.status = 'replied';
    await message.save();

    res.json({ ok: true, message: 'Reply sent successfully.' });
  } catch (error) {
    console.error("Reply error:", error);
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

export default router;
