//server/index.js
import express from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import fs from 'fs';
import axios from 'axios';
import bodyParser from 'body-parser';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import crypto from "crypto";
import cron from "node-cron";
import Product from './models/Product.js';
import Order from './models/Order.js';
import cartRoutes from './routes/cart.js';
import adminRoutes from "./routes/admin.js";
import checkoutRouter from "./routes/checkout.js";
import requireAdmin from "./middleware/requireAdmin.js";
import ContactMessage from "./models/ContactMessage.js";
import Newsletter from "./models/Newsletter.js";
import { authMiddleware } from "./middleware/auth.js";
import { OAuth2Client } from "google-auth-library";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import favoritesRoutes from "./routes/favorites.js";
import ratesRouter from "./routes/rates.js";
import path from "path";
import basicAuth from "express-basic-auth";
import fsExtra from "fs-extra";
import { fileURLToPath } from "url";
import newsletterRouter from "./routes/newsletter.js";
import aiMarketingRouter from "./routes/aiMarketing.js"
import socialRouter from "./routes/social.js";
import { runwayWebhook } from "./controllers/aiMarketingController.js";
import { sendOrderEmailsWithProducts, sendAdminEmail, sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail } from './mailer/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==== STATIC PATHS (frontend /products/... for images) ====

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "client", "public");
const PRODUCTS_DIR = path.join(PUBLIC_DIR, "products");
const GENERATED_DIR = path.join(PUBLIC_DIR, "generated");
console.log("PRODUCT PATH:", PRODUCTS_DIR);

// ensure it exists at startup
await fsExtra.ensureDir(PRODUCTS_DIR);

dotenv.config();
const app = express();
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(cookieParser());
app.use(
    helmet({
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://js.stripe.com",
                    "https://accounts.google.com",
                    "https://apis.google.com",
                    "https://pay.google.com",
                ],
                frameSrc: [
                    "'self'",
                    "https://js.stripe.com",
                    "https://hooks.stripe.com",
                    "https://accounts.google.com",
                    "https://pay.google.com",
                ],
                connectSrc: [
                    "'self'",
                    "https://api.stripe.com",
                    "https://r.stripe.com",
                    "https://m.stripe.network",
                    "https://accounts.google.com",
                    "https://www.googleapis.com",
                    "https://pay.google.com",
                    "https://api.dev.runwayml.com",
                    "https://api.deepseek.com",
                    "https://graph.facebook.com",
                    "https://open.tiktokapis.com",
                    "ws:",
                    "wss:",
                    //"http://localhost:*",
                    //"https://localhost:*",
                    process.env.CLIENT_URL || "",
                    process.env.API_URL || "",
                    "https://veyno.hu"
                ].filter(Boolean),
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://*.stripe.com",
                    "https://*.gstatic.com",
                    "https://*.googleusercontent.com",
                    "https://veyno.hu"
                ],
                styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
                "style-src-elem": ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
                frameAncestors: ["'self'"],
            },
        },
    })
);

// ==== Serving frontend build ====
const clientDist = path.join(__dirname, "../client/dist");

// ─────────────────────────────────────────────────────────────
// Dev lock / Basic Auth – ported from gate.js
// auth-toggle.txt content: "on" → site locked (non-/api routes)
// .env: GATE_USER, GATE_PASS, ALLOWLIST_IPS (comma separated)

const toggleFile = path.resolve(__dirname, "./auth-toggle.txt");

let authEnabled = false;
try {
    const content = fs.readFileSync(toggleFile, "utf-8").trim().toLowerCase();
    authEnabled = content === "on";
    console.log(`Auth status: ${authEnabled ? "ON" : "OFF"}`);
} catch {
    console.warn("auth-toggle.txt not found, OFF by default");
}

const DEVLOCK_USER = process.env.GATE_USER;
const DEVLOCK_PASS = process.env.GATE_PASS;

if (authEnabled && (!DEVLOCK_USER || !DEVLOCK_PASS)) {
    console.warn("Auth lock is ON but GATE_USER/GATE_PASS not set — disabling devlock for safety.");
    authEnabled = false;
}

const ALLOW_IPS = (process.env.ALLOWLIST_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function getClientIp(req) {
    const raw = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString();
    return raw.split(",")[0].trim();
}

//--------limiters--------
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests from this IP, please try again later.",
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many failed logins. Please try again later."
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many registrations from this IP address. Please try again later."
});

// /healthz – simple health endpoint
app.get("/api/healthz", (_req, res) => res.json({ ok: true, backend: true }));

// NEVER have Basic Auth under /api: delete the Basic header beforehand
app.use((req, _res, next) => {
    if (req.path.startsWith("/api") && req.headers.authorization?.startsWith("Basic ")) {
        delete req.headers.authorization;
    }
    next();
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const u = await User.findById(req.user.id).select("_id name email role");
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json(u);
});

// Development lock for non-/api requests
if (authEnabled) {
    const authMw = basicAuth({
        users: { [DEVLOCK_USER]: DEVLOCK_PASS },
        challenge: true,
        realm: "Dev Lock",
    });

    app.use((req, res, next) => {

        res.setHeader("X-Robots-Tag", "noindex, nofollow");

        if (req.path.startsWith("/api") || req.path === "/healthz") return next();

        if (ALLOW_IPS.length) {
            const ip = getClientIp(req);
            if (ALLOW_IPS.includes(ip)) return next();
        }

        return authMw(req, res, next);
    });
}

// static files
app.use(express.static(clientDist));

// /api root do not list
app.get("/api", (_req, res) => res.sendStatus(404));
app.options(/^\/api\/.*/, (_req, res) => res.sendStatus(200));

/* ===============================
Helper: collect products for order*/

async function loadProductsForOrder(order) {
    const ids = (order.items || []).map(i => i.productId);
    const products = await Product.find({ _id: { $in: ids } });
    return products;
}

// --- DEDUCT STOCK, ONCE --- //
async function decrementStockOnce(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found.");
    if (order.stockDecremented) return;

    for (const it of order.items || []) {
        const qty = Number(it.quantity || 0);
        const size = it.size || null;

        if (size) {
            // reduce variant stock + reduce total product stock
            const r = await Product.updateOne(
                { _id: it.productId, "variants.size": size, "variants.stock": { $gte: qty } },
                { $inc: { "variants.$.stock": -qty, stock: -qty } }
            );
            if (r.matchedCount === 0) {
                throw new Error(`There is not enough stock of size ${size}.`);
            }
        } else {
            // product without variants
            const ok = await Product.findOneAndUpdate(
                { _id: it.productId, stock: { $gte: qty } },
                { $inc: { stock: -qty } },
                { new: false }
            );
            if (!ok) {
                throw new Error("There is not enough stock for one of the items.");
            }
        }
    }

    order.stockDecremented = true;
    await order.save();
}

// --- Shipping calc helper
const FREE_SHIP = 50000;
const SHIPPING_PRICES = {
    standard: 1490,
    express: 2990,
    pickup: 0,
};

function calcShipping(method, subtotal) {
    const m = String(method || "standard");
    if (m === "pickup") return 0;
    if (Number(subtotal) >= FREE_SHIP) return 0;
    return SHIPPING_PRICES[m] ?? 0;
}

const num = (x) => Number(x || 0);
function normalizeShippingUSD(body = {}) {
    const ship = num(body.shippingCost);
    if (!isFinite(ship)) return 0;
    // if the client indicates USD (new app)
    if (String(body.baseCurrency).toUpperCase() === "USD" || body.shippingIsUSD) return ship;
    const hufRate = num(body?.rates?.HUF) || 370;
    return ship >= 200 ? ship / hufRate : ship;
}

/* ===============================
AI/Support Assistants
   =============================== */

// Order status
function statusHu(status) {
    const map = {
        pending: 'Pending (waiting for payment)',
        paid: 'Paid',
        processing: 'Under processing',
        packing: 'Under packaging',
        shipped: 'Sent (on its way)',
        delivered: 'Delivered',
        cancelled: 'Resigned',
        refunded: 'Refunded',
        failed: 'Order failed',
        awaiting_shipment: 'Waiting to be sent',
    };
    return map[status] || status || 'Unknown';
}
async function generateUniqueOrderNumber() {
    const y = new Date().getFullYear();
    for (let i = 0; i < 8; i++) {
        const seq = Math.floor(100000 + Math.random() * 900000);
        const ord = `ORD-${y}-${seq}`;
        const exists = await Order.exists({ orderNumber: ord });
        if (!exists) return ord;
    }
    // very rare fallback
    return `ORD-${y}-${Date.now().toString().slice(-6)}`;
}
function buildTrackingUrl({ courier, trackingNumber, trackingUrl }) {
    if (trackingUrl) return trackingUrl;
    if (!courier || !trackingNumber) return '';
    const n = encodeURIComponent(String(trackingNumber).trim());
    switch (String(courier).toUpperCase()) {
        case 'GLS': return `https://gls-group.com/HU/hu/csomagkovetes?match=${n}`;
        case 'DPD': return `https://tracking.dpd.de/status/${n}/hu_HU`;
        case 'MPL': return `https://www.posta.hu/nyomkovetes/nyitooldal?barcode=${n}`;
        default: return '';
    }
}

// Recognize order number / identifier from user message
// --- Extract order number from mixed text (WS/ORD + Stripe cs_* + ObjectId) ---
function parseOrderNumber(text = '') {
    if (!text) return null;
    const patterns = [
        /\bORD[-\s_]?\d{4}[-\s_]?\d{5,6}\b/i,                 // ORD-2025-000123
        /\bWS[-\s_]?\d{8}[-\s_]?[A-Z0-9]{4,}\b/i,             // WS-20250829-AB12CD
        /\bcs_(test|live)_[\w-]+\b/i,                         // Stripe session id
        /\b[0-9a-f]{24}\b/i,                                  // Mongo ObjectId
    ];
    for (const re of patterns) {
        const m = String(text).match(re);
        if (m) return m[0].replace(/\s/g, '');
    }
    return null;
}
function slugifyServer(s = "") {
    return String(s)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function productFolderParts(doc = {}) {
    const catSlug = slugifyServer(doc.category || "egyeb");
    const nameSlug = slugifyServer(doc.name || doc.title || doc.sku || String(doc._id || "termek"));
    const absCatDir = path.join(PRODUCTS_DIR, catSlug);
    const absProdDir = path.join(absCatDir, nameSlug);
    return { catSlug, nameSlug, absCatDir, absProdDir };
}

// --- Unified order finder: first orderNumber (WS/ORD), then ObjectId, then Stripe session ---
async function findOrderByAny(token) {
    if (!token) return null;

    // 1) orderNumber exact match (both WS and ORD)
    let order = await Order.findOne({ orderNumber: token }).populate('items.productId');
    if (order) return order;

    // 2) ObjectId
    if (mongoose.Types.ObjectId.isValid(token)) {
        order = await Order.findById(token).populate('items.productId');
        if (order) return order;
    }

    // 3) Stripe session id
    if (/^cs_(test|live)_/i.test(token)) {
        order = await Order.findOne({ stripeSessionId: token }).populate('items.productId');
        if (order) return order;
    }

    return null;
}

// CORS – exact origin + credentials
const allowedOrigins = [
    "https://veyno.hu",
    "http://veyno.hu",
    "http://localhost:5173",
    "http://localhost:5555",
    "https://localhost:5555",
    process.env.GATE_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("CORS blocked origin:", origin);
            callback(new Error(`CORS policy violation: ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "X-Newsletter-Token"
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ---- IMPORTANT: Stripe webhooks require a RAW body, so this is BEFORE express.json()! ---- */
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.sendStatus(400);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('Payment successful:', session.id);

                let order = await Order.findOne({ stripeSessionId: session.id });
                if (!order) {
                    const md = session.metadata || {};
                    const parsed = (k) => { try { return JSON.parse(md[k] || null); } catch { return null; } };
                    const itemsMeta = parsed("items") || [];

                    const subtotal = Number(md.subtotal || 0);
                    const discount = Math.max(0, Number(md.discount || 0));
                    const shippingCost = calcShipping(md.shippingMethod, subtotal);
                    const totalAmount = Math.max(0, subtotal - discount + shippingCost);

                    order = await Order.create({
                        userId: md.userId || null,
                        items: itemsMeta.map(n => ({
                            productId: n.productId,
                            name: n.name,
                            sku: n.sku || "",
                            size: n.size || null,
                            quantity: n.quantity,
                            unitPrice: n.unit,
                            originalPrice: n.orig,
                            lineTotal: n.lineTotal
                        })),
                        subtotal,
                        discount,
                        shippingCost,
                        totalAmount,
                        baseCurrency: "USD",
                        displayCurrency: "USD",
                        rates: { USD: 1 },
                        coupon: md.coupon || null,
                        customer: parsed("customer") || {},
                        shippingAddress: parsed("shippingAddress") || null,
                        billingAddress: parsed("billingAddress") || null,
                        shippingMethod: md.shippingMethod || null,
                        paymentMethod: "online",
                        note: md.note || "",
                        stripeSessionId: session.id,
                        status: "paid"
                    });
                } else {
                    // already existed -> we are only updating the status
                    order.status = 'paid';
                }

                // empty basket just now
                try {
                    if (order.userId) {
                        await User.findByIdAndUpdate(order.userId, { $set: { cart: [] } });
                    } else if (order.customer?.email) {
                        const user = await User.findOne({ email: order.customer.email });
                        if (user) { user.cart = []; await user.save(); }
                    }
                } catch (e) { console.warn("Cart emptying warning after webhook:", e?.message || e); }

                // stock deduction
                try { await decrementStockOnce(order._id); } catch (e) { console.warn("Stock decrement warn:", e?.message || e); }

                // email(s)
                try {
                    await sendPaymentEmail(order.customer?.email, order);
                    await sendAdminOrderEmail(order);
                    console.log('Payment confirmed email(s) sent (webhook).');
                } catch (e) {
                    console.error('Email sending error (webhook):', e);
                }

                await order.save();
            }
            default:
                console.log('Other Stripe event:', event.type);
        }
        res.json({ received: true });
    } catch (e) {
        console.error('Webhook processing error:', e);
        res.status(500).json({ error: 'Webhook processing error' });
    }
});

/* ---- normal JSON parser ---- */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

//UTF-8 headers for all JSON responses
app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
});

//Apple pay, google pay, payment on UI
app.post("/api/create-payment-intent", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate("cart.productId");
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const cart = Array.isArray(user.cart) ? user.cart : [];
        if (!cart.length) {
            return res.status(400).json({ error: "Your cart is empty." });
        }

        let subtotal = 0;
        for (const ci of cart) {
            const p = ci.productId;
            if (!p) continue;

            const qty = Math.max(1, Number(ci.quantity || 1));
            const unit = Number(p.effectivePrice ?? p.price) || 0;

            subtotal += unit * qty;
        }

        if (!isFinite(subtotal) || subtotal <= 0) {
            return res.status(400).json({ error: "Invalid cart total." });
        }

        const shippingMethod = req.body?.shippingMethod || "standard";
        const shippingCost = calcShipping(shippingMethod, subtotal);
        const total = subtotal + shippingCost;

        const amountMinor = Math.round(total * 100);

        if (amountMinor <= 0) {
            return res.status(400).json({ error: "Invalid payment amount." });
        }

        const pi = await stripe.paymentIntents.create({
            amount: amountMinor,
            currency: "huf",
            automatic_payment_methods: { enabled: true },
        });

        return res.json({ clientSecret: pi.client_secret });
    } catch (err) {
        console.error("create-payment-intent error:", err);
        return res.status(500).json({ error: "Could not create payment intent." });
    }
});
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const isProd = process.env.NODE_ENV === "production";

function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
}
function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/",
        maxAge: 7 * 24 * 3600 * 1000,
        domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
    });
}

//Registration
app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
        let { name, email, password } = req.body || {};
        if (!name || !email || !password)
            return res.status(400).json({ error: "Name, email and password are required." });
        if (password.length < 6)
            return res.status(400).json({ error: "The password must be at least 6 characters long." });

        email = String(email).toLowerCase().trim();
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "This email is already registered." });

        const verifyToken = crypto.randomBytes(32).toString("hex");

        //Cleaning
        const EXPIRE_DAYS = 7;
        const user = await User.create({
            name,
            email: email.toLowerCase().trim(),
            password,
            verified: false,
            verifyToken,
            verificationExpiresAt: new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000),
        });

        // origin architecture: works both locally and behind Cloudflare
        const proto = (req.headers["x-forwarded-proto"] || req.protocol);
        const host = (req.headers["x-forwarded-host"] || req.get("host"));
        const FRONT = `${proto}://${host}`.replace(/\/+$/, '');
        const verifyUrl = `${FRONT}/verify?token=${encodeURIComponent(verifyToken)}`;

        // We will NOT log you in here! We will send a verification email:
        await sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken, verifyUrl });

        return res.status(201).json({
            ok: true,
            message: "Verification email sent. Please check your inbox."
        });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ error: "Registration error." });
    }
});

// Email verification: POST /api/auth/verify (body: { token })
app.post("/api/auth/verify", async (req, res) => {
    try {
        const token = String(req.body?.token || "").trim();
        if (!token) return res.status(400).json({ error: "Missing token." });

        const user = await User.findOne({
            verifyToken: token,
            verificationExpiresAt: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ error: "Invalid or expired verification link." });

        // updates
        user.verified = true;
        user.verifyToken = null;
        user.verificationExpiresAt = null;
        await user.save();

        // JWT + cookie (same as login)
        const jwtPayload = { id: user._id, email: user.email, role: user.role };
        const authToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });
        setAuthCookie(res, authToken);

        // Return the user and token so the verify window can log in to the main window
        return res.json({
            ok: true,
            message: "Email verified successfully.",
            token: authToken,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error("verify error:", err);
        res.status(500).json({ error: "Verification failed." });
    }
});

// --- LOGIN ---
app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Missing credentials" });

        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ error: "Incorrect email or password" });

        const hasHash = !!user.password;
        const compareOk = hasHash ? await bcrypt.compare(password, user.password) : false;

        if (!compareOk)
            return res.status(400).json({ error: "Incorrect email or password" });

        if (!user.verified)
            return res.status(403).json({ error: "Please verify your email address before logging in." });

        // --- Token payload ---
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        // --- Cookie settings ---
        res.cookie("access_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
        });

        // --- Reply ---
        return res.json({
            ok: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Server error during login" });
    }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google login
app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = String(payload.email || "").toLowerCase();
        const googleId = payload.sub;

        // search by googleId or email (if previously local reg)
        let user = await User.findOne({ googleId }) || await User.findOne({ email });

        let isNew = false;
        if (!user) {
            // new user: google provider, VERIFIED immediately
            user = await User.create({
                name: payload.name || email.split("@")[0],
                email,
                googleId,
                provider: "google",
                verified: true,
                verifyToken: null,
                verificationExpiresAt: null,
                cart: [],
            });
            isNew = true;
        } else {
            // existing user: if there is no googleId, associate it and ensure it is verified
            if (!user.googleId) user.googleId = googleId;
            if (!user.verified) user.verified = true;
            user.verifyToken = null;
            user.verificationExpiresAt = null;
            user.provider = user.provider || "google";
            await user.save();
        }

        // issue a token and set a cookie (same as for a regular login)
        const jwtPayload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });
        setAuthCookie(res, token);

        return res.json({
            ok: true,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role },
            token,
        });
    } catch (err) {
        console.error("Google login error:", err?.message || err);
        return res.status(400).json({ error: err?.message || "Google login error" });
    }
});

// NEW: Logout
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("access_token", { path: "/" });
    res.json({ ok: true });
});

/* ===========================
   MongoDB
   =========================== */
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Cleaning algorithm runs daily at midnight
cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Checking unverified users to remind...");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const unverified = await User.find({
        verified: false,
        verifyToken: { $ne: null },
        createdAt: { $lte: since },
    }).limit(100);

    if (!unverified.length) {
        console.log("[CRON] No unverified users to remind.");
        return;
    }

    console.log(`[CRON] Preparing to send reminders for ${unverified.length} unverified accounts.`);

    for (const user of unverified) {
        try {
            const FRONT = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
            const verifyUrl = `${FRONT}/verify?token=${encodeURIComponent(user.verifyToken)}`;

            await sendVerificationEmail({
                to: user.email,
                name: user.name,
                token: user.verifyToken,
                verifyUrl,
                isReminder: true,
            });

            console.log(`Reminder sent (userId=${user._id})`);
        } catch (err) {
            console.warn(`Reminder failed (userId=${user._id}): ${err.message}`);
        }
    }
});

/* ======= Forgot password: send email link ======= */
app.post("/api/auth/forgot-password", publicLimiter, async (req, res) => {
    try {
        const email = String(req.body?.email || "").toLowerCase().trim();
        if (!email) return res.status(400).json({ error: "Please enter an email address." });

        const user = await User.findOne({ email });
        // We always give an 'ok' response to prevent account guessing
        if (!user) return res.json({ ok: true, message: "If the address exists, we sent an email." });

        // token generation + hash storage
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
        user.resetPasswordToken = hashed;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 óra
        await user.save();

        const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail({ to: email, resetUrl });

        res.json({ ok: true, message: "If the address exists, we sent an email." });
    } catch (err) {
        console.error("forgot-password error:", err);
        res.status(500).json({ error: "The email could not be sent." });
    }
});

/* ======= Password reset: save new password ======= */
app.post("/api/auth/reset-password", publicLimiter, async (req, res) => {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) return res.status(400).json({ error: "Missing data." });
        if (String(password).length < 6) return res.status(400).json({ error: "The password must be at least 6 characters long." });

        const hashed = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashed,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ error: "The link is invalid or expired." });

        user.password = password;
        user.passwordChangedAt = new Date();
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        // Automatic login
        const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        res.json({
            ok: true,
            message: "Password updated.",
            token: jwtToken,
            user: { _id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error("reset-password error:", err);
        res.status(500).json({ error: "An error occurred while updating your password." });
    }
});

const toSlug = (s = "") =>
    String(s)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

async function categoriesHandler(req, res) {
    try {
        const rows = await Product.aggregate([
            { $match: { category: { $type: "string" } } },
            { $addFields: { _cat: { $trim: { input: "$category" } } } },
            { $match: { _cat: { $ne: "" } } },
            { $group: { _id: { $toLower: "$_cat" }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        const data = rows.map(r => ({
            slug: toSlug(r._id || "egyeb"),
            title: (r._id || "Egyeb").charAt(0).toUpperCase() + (r._id || "Egyeb").slice(1),
            count: r.count,
        }));

        const now = new Date();
        const activeSaleFilter = {
            "sale.active": true,
            $and: [
                { $or: [{ "sale.startAt": { $exists: false } }, { "sale.startAt": { $lte: now } }] },
                { $or: [{ "sale.endAt": { $exists: false } }, { "sale.endAt": { $gte: now } }] },
            ],
        };

        const saleCount = await Product.countDocuments(activeSaleFilter);
        if (saleCount > 0) {
            data.push({ slug: "akciok", title: "Akciók", count: saleCount });
        }
        res.json(data);

    } catch (e) {
        console.error("GET /api/categories error:", e);
        res.status(500).json({ error: "Failed to list categories." });
    }
}

// SAME handler for two routes:
app.get("/api/categories", categoriesHandler);
app.get("/categories", categoriesHandler);

// Products
app.get('/api/products', async (req, res) => {
    try {
        const { category, brand, q } = req.query;
        const filter = {};
        const now = new Date();

        if (brand) filter.brand = brand;
        if (q) filter.name = { $regex: q, $options: 'i' };

        if (category) {
            const cat = String(category).toLowerCase();
            if (cat === "akciok") {
                Object.assign(filter, {
                    "sale.active": true,
                    $and: [
                        { $or: [{ "sale.startAt": { $exists: false } }, { "sale.startAt": { $lte: now } }] },
                        { $or: [{ "sale.endAt": { $exists: false } }, { "sale.endAt": { $gte: now } }] },
                    ],
                });
            } else {
                filter.category = category;
            }
        }

        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error retrieving products.' });
    }
});

// Retrieve a product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const prod = await Product.findById(req.params.id);
        if (!prod) return res.status(404).json({ error: 'The product is not found.' });
        res.json(prod);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid identifier.' });
    }
});

// --- Automatic folder management when saving/deleting a product ---

// After saving: create category+product folder
Product.schema.post("save", async function (doc) {
    try {
        const { absCatDir, absProdDir } = productFolderParts(doc);
        await fsExtra.ensureDir(absCatDir);
        await fsExtra.ensureDir(absProdDir);
    } catch (e) {
        console.warn("Product folder creation failed:", e?.message || e);
    }
});

// after findOneAndDelete: delete product folder (+ delete empty category)
Product.schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;
    try {
        const { absCatDir, absProdDir } = productFolderParts(doc);
        await fsExtra.remove(absProdDir);
        // if the category folder is empty, delete it
        try {
            const rest = await fsExtra.readdir(absCatDir);
            if (!rest || rest.length === 0) await fsExtra.remove(absCatDir);
        } catch { }
    } catch (e) {
        console.warn("Product folder deletion failed:", e?.message || e);
    }
});

// (optional) if you use doc.remove() somewhere:
Product.schema.post("remove", async function (doc) {
    try {
        const { absCatDir, absProdDir } = productFolderParts(doc);
        await fsExtra.remove(absProdDir);
        try {
            const rest = await fsExtra.readdir(absCatDir);
            if (!rest || rest.length === 0) await fsExtra.remove(absCatDir);
        } catch { }
    } catch (e) {
        console.warn("Product folder deletion (remove) failed:", e?.message || e);
    }
});

//const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- FIXED CHECKOUT HANDLER (with sale prices) ---
app.post("/api/checkout", async (req, res) => {
    try {
        const userId = req.user?._id || null;
        const {
            items = [],
            customer = {},
            shippingAddress = null,
            billingAddress = null,
            shippingMethod = null,
            paymentMethod = null,
            note = "",
            coupon = null,
            discount = 0,
        } = req.body || {};

        // 1) Loading products
        const ids = items.map(i => i.productId).filter(Boolean);
        if (!ids.length) return res.status(400).json({ error: "Empty cart." });

        const products = await Product.find({ _id: { $in: ids } });
        const byId = new Map(products.map(p => [String(p._id), p]));

        // 2) Normalization + summation (SALE price = effectivePrice)
        let subtotal = 0;
        const normalized = items.map(i => {
            const p = byId.get(String(i.productId));
            if (!p) throw new Error("Product not found");
            const qty = Math.max(1, Number(i.quantity || 1));

            const selSize = i.size || null;
            const v = Array.isArray(p.variants) ? p.variants.find(x => x.size === selSize) : null;
            const available = v ? Number(v.stock || 0) : Number(p.stock || 0);
            if (available < qty) {
                const err = new Error(selSize ? `This size is out of stock. ${selSize} ` : `Out of stock`);
                err.status = 400;
                throw err;
            }

            const unitBase = Number(p.effectivePrice ?? p.price) || 0;
            const unit = (v && v.priceOverride != null) ? Number(v.priceOverride) : unitBase;
            const orig = Number(p.price) || 0;
            const lineTotal = unit * qty;
            subtotal += lineTotal;

            return { product: p, quantity: qty, unit, orig, lineTotal, size: selSize };
        });

        // 3) Stripe session (for ONLINE payments, we DO NOT create an order here!)
        if (String(paymentMethod) === "online") {
            const toMinor = (ft) => Math.round(Number(ft || 0) * 100);
            const line_items = normalized.map(n => ({
                price_data: {
                    currency: "huf",
                    unit_amount: toMinor(n.unit),
                    product_data: {
                        name: n.product.name,
                    }
                },
                quantity: n.quantity
            }));

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items,
                success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${CLIENT_URL}/checkout?cancelled=1`,

                // Passing order data to the webhook
                metadata: {
                    userId: String(userId || ""),
                    items: JSON.stringify(normalized.map(n => ({
                        productId: String(n.product._id),
                        name: n.product.name,
                        sku: n.product.sku || "",
                        size: n.size || null,
                        quantity: n.quantity,
                        unit: n.unit,
                        orig: n.orig,
                        lineTotal: n.lineTotal
                    }))),
                    subtotal: String(subtotal),
                    discount: String(discountAmt),
                    shippingCost: String(shippingCost),
                    totalAmount: String(totalAmount),
                    coupon: coupon ? String(coupon) : "",
                    shippingMethod: String(shippingMethod || ""),
                    paymentMethod: "online",
                    customer: JSON.stringify(customer || {}),
                    shippingAddress: JSON.stringify(shippingAddress || {}),
                    billingAddress: JSON.stringify(billingAddress || {}),
                    note: String(note || "")
                }
            });

            // Store Stripe session ID
            return res.json({ url: session.url });
        }

        const discountAmt = Math.max(0, Number(discount || 0));
        let shippingCost = calcShipping(shippingMethod, subtotal);
        if (req.body?.shippingCost != null) {
            shippingCost = normalizeShippingUSD(req.body);
        }
        const totalAmount = Math.max(0, subtotal - discountAmt + shippingCost);

        // 4) Cash on delivery / other payment
        const order = await Order.create({
            userId,
            items: normalized.map(n => ({
                productId: n.product._id,
                name: n.product.name,
                image: (Array.isArray(n.product.images) && n.product.images[0]) ? n.product.images[0] : (n.product.image || ""),
                sku: n.product.sku || "",
                size: n.size || null,
                quantity: n.quantity,
                unitPrice: n.unit,
                originalPrice: n.orig,
                discountLabel: n.product?.sale?.active ? (n.product?.sale?.label || "") : "",
                lineTotal: n.lineTotal
            })),
            subtotal,
            discount: discountAmt,
            shippingCost,
            totalAmount,
            baseCurrency: "USD",
            displayCurrency: (req.body?.displayCurrency || "USD").toUpperCase(),
            rates: req.body?.rates || { USD: 1 },
            coupon,
            customer,
            shippingAddress,
            billingAddress,
            shippingMethod,
            paymentMethod,
            note,
            status: "pending"
        });
        try {
            await sendOrderEmailsWithProducts(order);
        } catch (e) {
            console.warn("ORDER EMAIL SEND ERROR (offline):", e?.message || e);
        }

        try {
            await decrementStockOnce(order._id);
        } catch (e) {
            console.warn("Stock decrement warn (offline):", e?.message || e);
        }

        return res.json({ orderId: order._id });
    } catch (err) {
        console.error("CHECKOUT ERROR:", err);
        return res.status(500).json({ error: "An error occurred while processing your order." });
    }
});

// Order status
app.get("/api/order-status/:id", authMiddleware, async (req, res) => {
    try {
        const keyRaw = String(req.params.id || "").trim();
        if (!keyRaw) {
            return res.status(400).json({ error: "Missing order identifier." });
        }

        const me = await User.findById(req.userId).select("_id email");
        if (!me) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const ownerFilter = {
            $or: [
                { userId: me._id },
                { "customer.email": me.email },
            ],
        };

        const key = keyRaw;
        let order = null;

        // 1) orderNumber (ORD-..., WS-...)
        order = await Order.findOne({
            orderNumber: key,
            ...ownerFilter,
        });

        // 2) Mongo ObjectId
        if (!order && mongoose.Types.ObjectId.isValid(key)) {
            order = await Order.findOne({
                _id: key,
                ...ownerFilter,
            });
        }

        // 3) Stripe session id (cs_test_... / cs_live_...)
        if (!order && /^cs_(test|live)_/i.test(key)) {
            order = await Order.findOne({
                stripeSessionId: key,
                ...ownerFilter,
            });
        }

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        return res.json({
            orderNumber: order.orderNumber || order._id?.toString(),
            status: order.status,
            trackingUrl: order.trackingUrl || null,
            createdAt: order.createdAt,
            estimatedDelivery: order.estimatedDelivery || null,
        });
    } catch (err) {
        console.error("GET /api/order-status/:id error:", err);
        return res.status(500).json({ error: "Error while querying the order." });
    }
});

// Retrieve an order (based on ObjectId / ORD-... / Stripe session id)
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
    try {
        const keyRaw = String(req.params.id || '').trim();
        if (!keyRaw) {
            return res.status(400).json({ error: "Missing order identifier." });
        }

        const me = await User.findById(req.userId).select("_id email");
        if (!me) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const ownerFilter = {
            $or: [
                { userId: me._id },
                { "customer.email": me.email }
            ],
        };

        const key = keyRaw;

        let order = await Order.findOne({
            orderNumber: key,
            ...ownerFilter,
        }).populate("items.productId");

        if (!order && mongoose.Types.ObjectId.isValid(key)) {
            order = await Order.findOne({
                _id: key,
                ...ownerFilter,
            }).populate("items.productId");
        }

        if (!order && /^cs_(test|live)_/i.test(key)) {
            order = await Order.findOne({
                stripeSessionId: key,
                ...ownerFilter,
            }).populate("items.productId");
        }

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        return res.json(order);
    } catch (e) {
        console.error("GET /orders/:id error:", e);
        return res.status(500).json({ error: "Error while querying the order." });
    }
});

// --- AUTO CATEGORIES: GET /categories ---
app.get("/api/categories", async (req, res) => {
    try {
        const rows = await Product.aggregate([
            { $match: { category: { $exists: true, $ne: "" } } },
            {
                $group: {
                    _id: { $toLower: "$category" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const toSlug = (s = "") =>
            String(s)
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        const data = rows.map((r) => {
            const raw = r._id || "egyeb";
            const slug = toSlug(raw);
            const title = raw.charAt(0).toUpperCase() + raw.slice(1);
            return { slug, title, count: r.count };
        });

        // NEW: sale category
        const saleCount = await Product.countDocuments({ "sale.active": true });
        if (saleCount > 0) {
            data.unshift({ slug: "akciok", title: "Akciók", count: saleCount });
        }

        res.json(data);
    } catch (e) {
        console.error("GET /categories error:", e);
        res.status(500).json({ error: "Failed to load categories." });
    }
});

// Contact form – send email to admin
app.post('/api/contact', publicLimiter, async (req, res) => {
    try {
        const { name, email, message } = req.body || {};
        if (!name || !email || !message) {
            return res.status(400).json({ ok: false, error: 'Missing fields.' });
        }

        // Instead of sending an email, we create the entry in the database
        await ContactMessage.create({ name, email, message });

        res.json({ ok: true });
    } catch (err) {
        console.error('/contact error:', err);
        res.status(500).json({ ok: false, error: 'Sending error.' });
    }
});

function escapeHtml(s = '') {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Get my profile
app.get('/api/me/profile', authMiddleware, async (req, res) => {
    const user = await User.findById(req.userId).select('_id name email');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
});

// Change your profile (currently: name)
app.put('/api/me/profile', authMiddleware, async (req, res) => {
    const { name } = req.body || {};
    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();

    const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: update },
        { new: true, select: '_id name email' }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
});

// Delete my account (GDPR-style account deletion)
app.delete("/api/me", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ error: "Missing user id" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        await Order.updateMany(
            { userId: user._id },
            { $set: { userId: null } }
        );

        await User.findByIdAndDelete(user._id);

        res.clearCookie("access_token", {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
        });

        return res.json({ ok: true, message: "Account deleted." });
    } catch (err) {
        console.error("DELETE /api/me error:", err);
        return res.status(500).json({
            error: "Server error while deleting account.",
        });
    }
});

// Change password (logged in)
async function handlePasswordChange(req, res) {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!newPassword) {
            return res.status(400).json({ error: "Missing fields." });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ error: "The new password must be at least 6 characters long." });
        }

        // CRITICAL FIX: Load user with password hash
        const user = await User.findById(req.userId).select("+password");
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // First-time password setup (Google users, etc.)
        if (!user.password) {
            user.password = newPassword;
            user.passwordChangedAt = new Date();
            await user.save();
            return res.json({ ok: true, message: "Password set." });
        }

        // Password change - current password required
        if (!currentPassword) {
            return res.status(400).json({ error: "Enter your current password." });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "The current password is incorrect." });
        }

        user.password = newPassword;
        user.passwordChangedAt = new Date();
        await user.save();

        return res.json({ ok: true, message: "Password updated." });

    } catch (err) {
        return res.status(500).json({ error: "An error occurred while updating your password." });
    }
}

// Make sure both PUT and POST use the same handler
app.put("/api/me/password", authMiddleware, handlePasswordChange);
app.post("/api/me/password", authMiddleware, handlePasswordChange);

// List of my orders (logged in)
app.get("/api/me/orders", authMiddleware, async (req, res) => {
    try {
        const me = await User.findById(req.userId);
        if (!me) return res.status(404).json({ error: "User not found." });

        const orders = await Order.find({
            $or: [
                { userId: req.userId },
                { "customer.email": me.email }
            ]
        })
            .sort({ createdAt: -1 })
            .populate({ path: "items.productId", model: "Product", strictPopulate: false });

        res.json(orders);
    } catch (e) {
        console.error("GET /me/orders error:", e);
        res.status(500).json({ error: "Error retrieving orders." });
    }
});

// CART RETRIEVE (linked to user, with product data, SIZE)
app.get('/api/me/cart', authMiddleware, async (req, res) => {
    const user = await User.findById(req.userId).populate('cart.productId');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const items = (user.cart || []).map(ci => {
        const p = ci.productId;
        return {
            productId: p?._id || ci.productId,
            quantity: ci.quantity,
            name: p?.name,
            price: p?.price,
            effectivePrice: p?.effectivePrice ?? p?.price,
            image: p?.image,
            category: p?.category,
            size: ci.size || null,
        };
    });
    res.json({ items });
});

// Get my profile
app.get('/api/me', authMiddleware, async (req, res) => {
    const user = await User.findById(req.userId)
        .select('_id name email createdAt phone defaultAddress newsletterOptIn');
    if (!user) return res.status(404).json({ error: 'User not found..' });
    res.json(user);
});

// Update your profile (name, email, phone, defaultAddress, newsletterOptIn)
app.patch('/api/me', authMiddleware, async (req, res) => {
    let { name, email, phone, defaultAddress, newsletterOptIn } = req.body || {};

    if (
        typeof name !== 'string' &&
        typeof email !== 'string' &&
        typeof phone !== 'string' &&
        typeof newsletterOptIn !== 'boolean' &&
        !(defaultAddress && typeof defaultAddress === 'object')
    ) {
        return res.status(400).json({ error: 'There is no data to modify.' });
    }

    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();

    if (typeof email === 'string' && email.trim()) {
        email = String(email).toLowerCase().trim();
        const exists = await User.findOne({ email, _id: { $ne: req.userId } });
        if (exists) return res.status(409).json({ error: 'There is already an account with this email address.' });
        update.email = email;
    }

    if (typeof phone === 'string') update.phone = phone.trim();

    if (defaultAddress && typeof defaultAddress === 'object') {
        update.defaultAddress = {
            country: defaultAddress.country || 'HU',
            postalCode: defaultAddress.postalCode || '',
            city: defaultAddress.city || '',
            line1: defaultAddress.line1 || '',
            line2: defaultAddress.line2 || ''
        };
    }

    if (typeof newsletterOptIn === 'boolean') update.newsletterOptIn = newsletterOptIn;

    const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: update },
        { new: true, select: '_id name email createdAt phone defaultAddress newsletterOptIn' }
    );

    if (!user) return res.status(404).json({ error: 'User not found..' });
    res.json(user);
});

// Newsletter toggle from account (auth required)
app.patch("/api/me/newsletter", authMiddleware, async (req, res) => {
  try {
    const { subscribe } = req.body || {};

    if (typeof subscribe !== "boolean") {
      return res.status(400).json({ error: "Field 'subscribe' (boolean) is required." });
    }

    const user = await User.findById(req.userId).select("_id email newsletterOptIn");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const email = String(user.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "User has no email address." });
    }

    if (subscribe) {
      const already = await Newsletter.findOne({ email }).lean();
      if (!already) {
        await Newsletter.create({ email });
        try {
          await sendWelcomeEmail(email);
        } catch (e) {
          console.error("sendWelcomeEmail error (/api/me/newsletter):", e);
        }
      }
    } else {
      await Newsletter.deleteOne({ email });
    }

    user.newsletterOptIn = subscribe;
    await user.save();

    return res.json({ subscribed: subscribe });
  } catch (err) {
    console.error("PATCH /api/me/newsletter error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ADD/INCREMENT ITEM (atomic, version-safe)
app.post('/api/me/cart/add', authMiddleware, async (req, res) => {
    const { productId, quantity = 1, size = null } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId is needed.' });

    const uid = req.userId;
    const q = Math.max(1, Number(quantity) || 1);

    // 1) try to increase the existing item (productId+size)
    const incRes = await User.updateOne(
        { _id: uid, "cart.productId": productId, "cart.size": size },
        { $inc: { "cart.$.quantity": q } }
    );

    if (incRes.modifiedCount === 0) {
        // 2) there was no such item → push as new item
        await User.updateOne(
            { _id: uid },
            { $push: { cart: { productId, quantity: q, size } } }
        );
    }

    return res.json({ ok: true });
});

// OVERWRITE ENTIRE CART (with productId+size key, version-safe)
app.put('/api/me/cart', authMiddleware, async (req, res) => {
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    const uid = req.userId;

    // productId+size key generation and merging
    const map = new Map();
    for (const it of list) {
        const id = String(it.productId || it._id || it.id || "");
        if (!id) continue;
        const size = it.size ?? null;
        const key = `${id}|${size ?? ""}`;
        const q = Math.max(1, Number(it.quantity ?? it.qty ?? 1));
        map.set(key, (map.get(key) || 0) + q);
    }

    const newCart = Array.from(map, ([key, quantity]) => {
        const [productId, sizeRaw] = key.split("|");
        return { productId, quantity, size: sizeRaw || null };
    });

    // Single atomic update – no version conflicts
    await User.updateOne({ _id: uid }, { $set: { cart: newCart } });

    return res.json({ ok: true });
});

// COLLECT CART (version-safe, productId+size)
app.post('/api/me/cart/merge', authMiddleware, async (req, res) => {
    const guest = Array.isArray(req.body?.items) ? req.body.items : [];
    const uid = req.userId;

    // 1) read current server cart (only cart field)
    const me = await User.findById(uid).select("cart");
    if (!me) return res.status(404).json({ error: "User not found." });

    // 2) merge by productId+size
    const map = new Map();

    for (const i of me.cart || []) {
        const key = `${String(i.productId)}|${i.size ?? ""}`;
        map.set(key, (map.get(key) || 0) + Number(i.quantity || 0));
    }

    for (const it of guest) {
        const id = String(it.productId || it._id || it.id || "");
        if (!id) continue;
        const size = it.size ?? null;
        const key = `${id}|${size ?? ""}`;
        const q = Math.max(1, Number(it.quantity ?? it.qty ?? 1));
        map.set(key, (map.get(key) || 0) + q);
    }

    const merged = Array.from(map, ([key, quantity]) => {
        const [productId, sizeRaw] = key.split("|");
        return { productId, quantity, size: sizeRaw || null };
    });

    // 3) single $set – no version race
    await User.updateOne({ _id: uid }, { $set: { cart: merged } });
    const updated = await User.findById(uid).populate("cart.productId").select("cart");
    return res.json({ ok: true, cart: updated.cart });
});

// DELETE CART (can also be used when logging out)
app.post('/api/me/cart/clear', authMiddleware, async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    user.cart = [];
    await user.save();
    res.json({ ok: true });
});

// AI lookup: /ai/orders/lookup?q=ORD-2025-123456
app.get('/api/ai/orders/lookup', authMiddleware, async (req, res) => {
    try {
        const raw = String(req.query.q || req.query.order || req.query.id || '');
        const token = parseOrderNumber(raw) || raw.trim();
        if (!token) return res.json({ found: false });

        const order = await Order.findOne({
            orderNumber: token,
            $or: [
                { userId: req.user._id },
                { "customer.email": req.user.email }
            ]
        });
        
        if (!order) return res.json({ found: false });

        // AI only needs the necessary, harmless data
        const clean = {
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
            shippingMethod: order.shippingMethod,
            trackingUrl: order.trackingUrl || null,
            totalAmount: order.totalAmount,
            items: (order.items || []).map(it => ({
                name: it.productId?.name || it.name,
                quantity: it.quantity,
                price: it.productId?.price ?? it.price,
            })),
        };
        return res.json({ found: true, order: clean });
    } catch (e) {
        console.error('AI lookup error:', e);
        return res.status(500).json({ found: false, error: 'Lookup error' });
    }
});

/* ===============================
AI Customer Service – Order Number Based DB + DeepSeek
   ===============================
*/
app.post('/api/ai/support', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                ok: false,
                reply: "Please log in to ask about your order.",
            });
        }

        const userMsg = String(req.body?.message ?? req.body?.text ?? '').slice(0, 2000);
        const token = parseOrderNumber(userMsg);

        let order = null;

        const ownerFilter = {
            $or: [
                { user: req.user._id },
                { "customer.email": req.user.email }
            ]
        };

        // 1) orderNumber (WS-..., ORD-..., stb.)
        if (token) {
            try {
                order = await Order.findOne({
                    orderNumber: token,
                    ...ownerFilter,
                }).populate('items.productId');
            } catch (_) { }
        }

        // 2) Mongo ObjectId
        if (!order && token && mongoose.Types.ObjectId.isValid(token)) {
            try {
                order = await Order.findOne({
                    _id: token,
                    ...ownerFilter,
                }).populate('items.productId');
            } catch (_) { }
        }

        // 3) Stripe session id
        if (!order && token && /^cs_(test|live)_/i.test(token)) {
            try {
                order = await Order.findOne({
                    stripeSessionId: token,
                    ...ownerFilter,
                }).populate('items.productId');
            } catch (_) { }
        }

        const summary = order ? {
            orderNumber: order.orderNumber || order._id?.toString(),
            status: order.status,
            statusText: statusHu(order.status),
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            shippingMethod: order.shippingMethod,
            paymentMethod: order.paymentMethod,
            estimatedDelivery: order.estimatedDelivery || null,
            items: (order.items || []).map(it => ({
                name: it.productId?.name || it.name,
                quantity: it.quantity,
                price: it.productId?.price ?? it.price,
            })),
        } : null;

        const systemPrompt = `
            You are a friendly customer service assistant at the Webshop.
            Answer from the data provided in the "ORDER CONTEXT" block - don't make anything up.
            If there is a tracking link, provide it. If there is no order number or it cannot be found, ask for the exact number.
            Be concise, polite, helpful.
        `.trim();

        const context = summary
            ? `ORDER CONTEXT: (JSON):\n${JSON.stringify(summary)}`
            : 'ORDER CONTEXT: NO MATCHES found based on the message provided. Please provide an exact order number (WS-… or ORD-…).';

        let reply;
        try {
            const dsResp = await axios.post(
                'https://api.deepseek.com/v1/chat/completions',
                {
                    model: 'deepseek-chat',
                    temperature: 0.2,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'system', content: context },
                        { role: 'user', content: userMsg },
                    ],
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 20000,
                }
            );
            reply = dsResp?.data?.choices?.[0]?.message?.content;
        } catch (e) {
            console.warn('DeepSeek call error:', e?.response?.data || e?.message);
        }

        if (!reply) {
            reply = summary
                ? `Order ${summary.orderNumber} status: ${summary.statusText}.`
                : 'Please enter your order ID (e.g. WS-20250829-AB12CD or ORD-2025-000123) so I can check its status.';
        }

        return res.json({
            ok: true,
            reply,
            orderFound: Boolean(summary),
            order: summary,
        });
    } catch (err) {
        console.error('❌ /ai/support error:', err);
        return res.status(500).json({
            ok: false,
            reply: `Oops, I can't access the AI ​​service right now. Please try again later or write to us on the Contact page.`,
        });
    }
});

// Chatbot proxy
app.post('/api/chat', publicLimiter, async (req, res) => {
    try {
        const { messages } = req.body || {};
        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const dsResp = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            { model: 'deepseek-chat', messages, temperature: 0.2 },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                },
                timeout: 20000,
            }
        );

        return res.json(dsResp.data);
    } catch (err) {
        console.error('Chatbot backend error:', err?.response?.data || err?.message || err);
        return res.status(500).json({ error: 'Chatbot API error' });
    }
});

// Admin route
app.use("/api/admin", requireAdmin, adminRoutes);

// Kosár route
app.use('/api/cart', cartRoutes);

//Currency changer
app.use("/api/rates", ratesRouter);

//Social media poster agent route
app.use("/api/social", authMiddleware, requireAdmin, socialRouter);

//Serve as frontend under /products
app.use("/api/products", express.static(PRODUCTS_DIR));

//Newsletter path
app.use("/api/newsletter", publicLimiter, newsletterRouter);

//Generated agent route
app.use("/generated", express.static(GENERATED_DIR));

//Ai marketing agent route image generator
app.use("/api/ai-marketing", authMiddleware, requireAdmin, aiMarketingRouter);

//Ai marketing agent route video generator
app.post("/api/ai-marketing/runway/webhook", express.json(), runwayWebhook);

//Kedvencek route
app.use("/api/favorites", authMiddleware, favoritesRoutes);

//Checkout route
app.use("/api/checkout", checkoutRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// SPA fallback: all NON /api and NON /webhook requests go to React index.html
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/webhook") return next();
    res.sendFile(path.join(clientDist, "index.html"));
});

/* ===========================
   HTTP server
   =========================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (authEnabled) {
        console.log(`   Dev lock: ON  (user: ${DEVLOCK_USER})`);
        if (ALLOW_IPS.length) console.log(`   Allowlist: ${ALLOW_IPS.join(", ")}`);
    } else {
        console.log("   Dev lock: OFF");
    }
});

