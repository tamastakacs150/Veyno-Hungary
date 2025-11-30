//server/utils/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import ProductModel from "../models/Product.js";

dotenv.config();

/** ====== Base config ====== */
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 465 -> true, otherwise false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Where the /products physical files live (frontend/public)
const STATIC_ROOT =
  process.env.STATIC_ROOT_ABS_PATH ||
  path.join(process.cwd(), "dist", "client", "public");

// Public origin from which images are available over HTTP
const PUBLIC_BASE =
  (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") ||
  "http://localhost:5173";

/** ====== Helpers ====== */
const IMAGE_EXTS = ["webp", "jpg", "jpeg", "png"];

function slugify(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function folderFromProduct(p = {}) {
  const direct = (p.imageFolder || p.folder || "").trim().replace(/^\/+|\/+$/g, "");
  if (direct) return direct;
  const productSlug = slugify(p.slug || p.name || p.sku || p._id || "product");
  const cat = slugify(p.category || "other");
  return `${cat}/${productSlug}`;
}

/** Finds the first existing 1.{ext} in the product folder and returns an absolute URL. */
function productMainImageUrl(product) {
  const folder = folderFromProduct(product);
  for (const ext of IMAGE_EXTS) {
    const rel = path.posix.join("products", folder, `1.${ext}`);
    const abs = path.join(STATIC_ROOT, rel);
    if (fs.existsSync(abs)) {
      return `${PUBLIC_BASE}/${rel}`;
    }
  }
  const placeholderRel = "placeholder.svg";
  const placeholderAbs = path.join(STATIC_ROOT, placeholderRel);
  return fs.existsSync(placeholderAbs)
    ? `${PUBLIC_BASE}/${placeholderRel}`
    : `${PUBLIC_BASE}/products/placeholder.svg`;
}

const DISPLAY_CURRENCY = (process.env.DISPLAY_CURRENCY || "USD").toUpperCase();

function formatMoney(n, curr = DISPLAY_CURRENCY) {
  const c = (curr === "HUF" || curr === "USD" || curr === "EUR") ? curr : "USD";
  const locales = { HUF: "hu-HU", USD: "en-US", EUR: "de-DE" };
  const val = Number(n || 0);
  const opts = { style: "currency", currency: c };

  // Rules: HUF – 0 decimal; USD/EUR – round to whole
  if (c === "HUF") Object.assign(opts, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (c === "USD" || c === "EUR") Object.assign(opts, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return new Intl.NumberFormat(locales[c], opts).format(c === "USD" || c === "EUR" ? Math.round(val) : Math.round(val));
}

function num(x) {
  return Number(x || 0);
}

function pickUnit(it, p) {
  // Priority: unitPrice (if the backend has already saved it), then effectivePrice (on sale), then price
  return num(it?.unitPrice ?? it?.effectivePrice ?? it?.price ?? p?.price ?? 0);
}

function normalizeShippingUSD(order = {}) {
  const ship = num(order.shippingCost);
  // If our order is already USD-based, leave it as is
  if (order.baseCurrency === "USD" || order.shippingIsUSD === 1) return ship;

  // If order.rates.HUF exists, use it; otherwise fallback 370
  const hufRate = num(order?.rates?.HUF || process.env.RATE_HUF || 370);

  // Heuristic: if shipping was “large” (>=200), it was probably HUF (e.g. 1490)
  if (ship >= 200 && hufRate > 0) {
    return ship / hufRate; // USD
  }
  return ship; // already USD
}

function computeOrderTotals(order = {}, productsById = new Map()) {
  const items = Array.isArray(order.items) ? order.items : [];
  let subtotal = 0;

  for (const it of items) {
    const idStr = String(it?.productId?._id || it?.productId || it?._id || it?.id || "");
    const p = (idStr && productsById.get(idStr)) || null;
    const qty = Math.max(1, num(it?.quantity ?? 1));
    const unit = pickUnit(it, p);
    subtotal += unit * qty;
  }

  const discount = num(order.discount);
  const shipping = normalizeShippingUSD(order);
  const total = Math.max(0, subtotal - discount + shipping);

  return { subtotal, discount, shipping, total };
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

async function loadProductsByIds(ids = []) {
  const uniq = [...new Set(ids.map(String))];
  if (uniq.length === 0) return new Map();
  const docs = await ProductModel.find({ _id: { $in: uniq } })
    .select("_id name brand price category slug imageFolder folder sku")
    .lean();
  const map = new Map();
  for (const d of docs) map.set(String(d._id), d);
  return map;
}

export async function sendOrderEmailsWithProducts(order) {
  const ids = (order.items || []).map((it) => String(it.productId?._id || it.productId || ""));
  const productsById = await loadProductsByIds(ids);

  // To customer
  if (order?.customer?.email) {
    await sendOrderEmail(order.customer.email, order, productsById);
  }

  // To admin
  await sendAdminOrderEmail(order, productsById);
}

/** ====== Modern black & white email shell ====== */
function wrapEmail(contentHtml) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .email-header { padding: 32px 24px 24px !important; }
        .email-content { padding: 32px 24px !important; }
        .email-footer { padding: 16px 24px !important; }
        .email-title { font-size: 24px !important; }
        .email-subtitle { font-size: 20px !important; }
        .email-button { padding: 14px 24px !important; font-size: 12px !important; }
        .info-grid { display: block !important; }
        .info-grid > div { margin-bottom: 12px !important; }
        .hero-section { padding: 32px 24px !important; }
        .hero-title { font-size: 28px !important; }
        .coupon-code { font-size: 16px !important; padding: 10px 20px !important; }
      }
      /* Dark mode safe text color fallbacks for some clients */
      .text-black { color: #000 !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;padding:24px 12px;">
      <tr>
        <td align="center" style="margin:0;padding:0;">
          <table role="presentation" class="email-container" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:0;margin:0;">
                ${contentHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function emailHeader() {
  return `
  <div class="email-header" style="padding:48px 48px 32px;border-bottom:2px solid #000;">
    <h1 class="email-title" style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#000;">VEYNO</h1>
    <div style="height:4px;width:48px;background:#000;"></div>
  </div>`;
}

function emailFooter() {
  return `
  <div class="email-footer" style="padding:24px 48px;border-top:1px solid #e5e5e5;">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">© ${new Date().getFullYear()} VEYNO. All rights reserved.</p>
  </div>`;
}

/** ====== Product items table (modern design, real data) ====== */
function buildModernItemsHtml(order, productsById = new Map()) {
  const rows = (order.items || [])
    .map((it) => {
      const idStr = (it.productId?._id || it.productId || it._id || it.id || "").toString();
      const p = productsById.get(idStr) || it || {};
      const name = p?.name || it?.name || (idStr ? `Product (${idStr.slice(-6)})` : "Product");
      const qty = Math.max(1, Number(it?.quantity ?? 1));
      const unit = pickUnit(it, p);
      const lineTotal = num(it?.lineTotal ?? unit * qty);
      // Optional product image (kept minimal to preserve template look)
      const img = productMainImageUrl(p);

      return `
      <tr>
        <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <img src="${img}" alt="${escapeHtml(name)}" width="48" height="48" style="display:block;object-fit:cover;border-radius:6px;" />
            <div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#000;">${escapeHtml(name)}</p>
              ${p?.brand ? `<p style="margin:0;font-size:11px;color:#9ca3af;">${escapeHtml(p.brand)}</p>` : ""}
              ${it?.size ? `<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Size: ${escapeHtml(String(it.size))}</p>` : ""}
            </div>
          </div>
        </td>
        <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;">${formatMoney(unit, order?.displayCurrency)}</td>
        <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:13px;font-weight:600;">${qty}</td>
        <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;">${formatMoney(lineTotal, order?.displayCurrency)}</td>
      </tr>`;
    })
    .join("");

  return `
    <div style="border:1px solid #e5e5e5;margin-bottom:32px;">
      <div style="padding:16px 24px;background:#f9fafb;border-bottom:2px solid #000;">
        <h3 style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Order Items</h3>
      </div>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #e5e5e5;">
            <th style="padding:12px 24px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
            <th style="padding:12px 24px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
            <th style="padding:12px 24px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
            <th style="padding:12px 24px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="padding:16px 24px;background:#000;color:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Grand Total</span>
          ${(() => {
      const totals = computeOrderTotals(order, productsById);
      return `<span style="font-size:20px;font-weight:700;">${formatMoney(totals.total, order?.displayCurrency)}</span>`;
    })()}
        </div>
      </div>
    </div>
  `;
}

/** ====== Public email senders (modern templates, real data) ====== */

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") ||
  "http://localhost:5173";
const FRONT = FRONTEND_URL.replace(/\/+$/, "");


export async function sendWelcomeEmail(to) {
  if (!to) return;

  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <h2 class="email-subtitle" style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#000;">Welcome to the Newsletter</h2>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
        Thank you for subscribing! You're now part of our exclusive community and will be the first to know about new arrivals, special offers, and style inspiration.
      </p>

      <div class="hero-section" style="padding:48px;background:#000;color:#fff;text-align:center;margin-bottom:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">Your Welcome Gift</p>
        <h3 class="hero-title" style="margin:0 0 8px;font-size:36px;font-weight:700;letter-spacing:-1px;">10% OFF</h3>
        <p style="margin:0 0 16px;font-size:13px;opacity:0.9;">Use code at checkout</p>
        <div class="coupon-code" style="display:inline-block;padding:12px 24px;background:#fff;color:#000;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:4px;">
          VEYNO10
        </div>
      </div>

      <p style="margin:0 0 32px;font-size:13px;color:#6b7280;line-height:1.6;">
        This coupon code is valid for your next purchase. Simply enter it at checkout to receive your discount.
      </p>

      <div style="padding-top:24px;border-top:1px solid #e5e5e5;">
        <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
          You're receiving this email because you subscribed to the VEYNO newsletter.
        </p>
      </div>
    </div>
    ${emailFooter()}
  `;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject: "Welcome to VEYNO Newsletter · Your 10% Discount Code",
    html,
  });
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!to || !resetUrl) return;

  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <h2 class="email-subtitle" style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#000;">Password Reset</h2>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>

      <div style="margin:0 0 32px;padding:24px;background:#f9fafb;border-left:4px solid #000;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#000;">Important</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">This link is valid for 1 hour only.</p>
      </div>

      <a href="${resetUrl}" class="email-button"
         style="display:inline-block;padding:16px 32px;background:#000;color:#fff;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
        Reset Password
      </a>

      <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e5e5;">
        <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
    ${emailFooter()}
  `;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject: "Password Reset Request",
    html,
  });
}

export async function sendOrderEmail(to, order, productsById = new Map()) {
  if (!to) return;

  const itemsHtml = buildModernItemsHtml(order, productsById);
  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <h2 class="email-subtitle" style="margin:0 0 12px;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#000;">Order Confirmed</h2>
      ${order.orderNumber ? `<p style="margin:0 0 32px;font-size:13px;color:#6b7280;">Order #${escapeHtml(order.orderNumber)}</p>` : ""}

      <div class="info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
        <div>
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#000;">Payment Method</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">${escapeHtml(order.paymentMethod || "-")}</p>
        </div>
        <div>
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#000;">Shipping Method</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">${escapeHtml(order.shippingMethod || "-")}</p>
        </div>
      </div>

      <div style="margin-bottom:32px;border:1px solid #e5e5e5;">
        <div style="padding:16px 24px;background:#f9fafb;border-bottom:2px solid #000;">
          <h3 style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#000;">Customer Details</h3>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;font-size:13px;"><span style="font-weight:600;">Name:</span> ${escapeHtml(order.customer?.name || "")}</p>
          <p style="margin:0 0 8px;font-size:13px;"><span style="font-weight:600;">Email:</span> ${escapeHtml(order.customer?.email || "")}</p>
          <p style="margin:0 0 8px;font-size:13px;"><span style="font-weight:600;">Phone:</span> ${escapeHtml(order.customer?.phone || "")}</p>
          ${order.shippingAddress
      ? `<p style="margin:0;font-size:13px;"><span style="font-weight:600;">Address:</span> ${escapeHtml(order.shippingAddress?.line1 || "")}${order.shippingAddress?.line2 ? ", " + escapeHtml(order.shippingAddress.line2) : ""
      }, ${escapeHtml(order.shippingAddress?.postalCode || "")} ${escapeHtml(order.shippingAddress?.city || "")}${order.shippingAddress?.country ? ", " + escapeHtml(order.shippingAddress.country) : ""
      }</p>`
      : ""
    }
        </div>
      </div>

      ${itemsHtml}

      ${Number(order?.discount || 0) > 0 || order?.coupon || order?.couponCode
      ? `<p style="text-align:right;margin:6px 0 0;color:#444;">
                ${order?.coupon || order?.couponCode
        ? `Coupon: <b>${escapeHtml(order.coupon || order.couponCode)}</b> – discount: <b>-${formatMoney(
          Number(order.discount || 0)
        )}</b>`
        : `Discount: <b>-${formatMoney(Number(order.discount || 0), order?.displayCurrency)}</b>`
      }
             </p>`
      : ""
    }
    </div>
    ${emailFooter()}
  `;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || process.env.SMTP_USER,
    to,
    subject: `Order Confirmation${order?.orderNumber ? ` – ${order.orderNumber}` : ""}`,
    html,
  });
}

export async function sendPaymentEmail(to, order, productsById = new Map()) {
  if (!to) return;

  const inner = `
    ${emailHeader()}
    <div style="padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <div class="hero-section" style="padding:48px;background:#000;color:#fff;text-align:center;">
        <h2 class="hero-title" style="margin:0 0 8px;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Payment Confirmed</h2>
        ${order.orderNumber ? `<p style="margin:0;font-size:13px;opacity:0.9;">Order #${escapeHtml(order.orderNumber)}</p>` : ""}
      </div>

      <div class="email-content" style="padding:48px;">
        <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#4b5563;">
          Your payment has been successfully processed. Your order is now being prepared for shipment.
        </p>

        <div style="margin-bottom:32px;border:1px solid #e5e5e5;">
          <div style="padding:16px 24px;background:#f9fafb;border-bottom:1px solid #e5e5e5;">
            <h3 style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Order Summary</h3>
          </div>
          <div style="padding:24px;">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f3f4f6;">
              <span style="font-size:13px;">Subtotal</span>
              ${(() => {
      const t = computeOrderTotals(order);
      return `<span style="font-size:13px;font-weight:600;">${formatMoney(t.subtotal, order?.displayCurrency)}</span>`;
    })()}
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f3f4f6;">
              <span style="font-size:13px;">Shipping</span>
              ${(() => {
      const t = computeOrderTotals(order);
      return `<span style="font-size:13px;font-weight:600;">${formatMoney(t.shipping, order?.displayCurrency)}</span>`;
    })()}
            </div>
            <div style="margin-top:12px;padding:16px;background:#000;color:#fff;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Total Paid</span>
                ${(() => {
      const t = computeOrderTotals(order);
      return `<span style="font-size:20px;font-weight:700;">${formatMoney(t.total, order?.displayCurrency)}</span>`;
    })()}
              </div>
            </div>
          </div>
        </div>

        <div style="padding:24px;background:#f9fafb;border-left:4px solid #000;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#000;">What's Next?</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">We're preparing your order and will send you tracking information soon.</p>
        </div>
      </div>
    </div>
    ${emailFooter()}
  `;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || process.env.SMTP_USER,
    to,
    subject: `Payment Confirmed${order?.orderNumber ? ` – ${order.orderNumber}` : ""}`,
    html,
  });
}

export async function sendVerificationEmail({ to, name, token, verifyUrl, isReminder = false }) {
  if (!to || !token) return;

  const first = String(name || "").split(" ")[0] || "Dear Customer";
  const FRONT = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, '');
  const href = verifyUrl || `${FRONT}/verify?token=${encodeURIComponent(token)}`;

  const subject = isReminder
    ? "Reminder: Please verify your VEYNO account"
    : "Verify your VEYNO account";

  const inner = `
  ${emailHeader()}
  <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <h2 class="email-subtitle" style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#000;">
      Verify your email
    </h2>
    <p style="margin:0 0 16px;font-size:16px;color:#000;">
      Hello, <strong>${escapeHtml(first)}</strong>!
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#4b5563;">
      Please confirm your email address to activate your VEYNO account.  
      Once verified, you can safely close the browser window — the site where you registered will log you in automatically.
    </p>
    <a href="${href}" target="_blank" rel="noopener"
       style="display:inline-block;padding:16px 32px;background:#000;color:#fff;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
      Verify Email
    </a>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        If you didn’t create an account, please ignore this message.
      </p>
    </div>
  </div>
  ${emailFooter()}
`;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendReplyEmail({ to, name, replyText, originalMessage }) {
  const subject = `Válasz a VEYNO weboldalon küldött üzenetére`;

  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <h2 class="email-subtitle" style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#000;">Our response to your message</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
        Dear ${escapeHtml(name)},<br><br>
        Thank you for your inquiry. You can read our response below:
      </p>

      <div style="margin:0 0 32px;padding:24px;background:#f9fafb;border-left:4px solid #000;">
        <p style="margin:0;font-size:14px;color:#000;line-height:1.6;">${escapeHtml(replyText).replace(/\n/g, '<br/>')}</p>
      </div>
      
      <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e5e5;">
        <p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.5;">
          <b>Your original message:</b>
        </p>
        <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;font-style:italic;">
          "${escapeHtml(originalMessage)}"
        </p>
      </div>
    </div>
    ${emailFooter()}
  `;
  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

/**
 * Admin notification – new order (expects the full order object)
 */
export async function sendAdminOrderEmail(order, productsById = new Map()) {
  if (!process.env.SHOP_ADMIN_EMAIL) return;

  const subject = `New order: ${order?.orderNumber || order?._id || ""} – ${order?.customer?.name || ""}`.trim();
  const text = `A new order has arrived.
  Total: ${formatMoney(order?.totalAmount || 0)}
  Payment: ${order?.paymentMethod || "-"}
  Customer: ${order?.customer?.name || "-"} (${order?.customer?.email || "-"})`;

  const itemsHtml = buildModernItemsHtml(order, productsById);
  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#000;">New order</h2>

      ${order.orderNumber ? `<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Order number: <b>${escapeHtml(order.orderNumber)}</b></p>` : ""}

      <div style="margin-bottom:16px;border:1px solid #e5e5e5;">
        <div style="padding:12px 16px;background:#f9fafb;border-bottom:2px solid #000;">
          <h3 style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Customer Details</h3>
        </div>
        <div style="padding:16px;">
          <p style="margin:0 0 6px;font-size:13px;">Name: <b>${escapeHtml(order.customer?.name || "")}</b></p>
          <p style="margin:0 0 6px;font-size:13px;">Email: <b>${escapeHtml(order.customer?.email || "")}</b></p>
          <p style="margin:0 0 6px;font-size:13px;">Phone: <b>${escapeHtml(order.customer?.phone || "")}</b></p>
          ${order.shippingAddress
      ? `<p style="margin:0;font-size:13px;">Address: <b>${escapeHtml(order.shippingAddress?.line1 || "")}${order.shippingAddress?.line2 ? ", " + escapeHtml(order.shippingAddress.line2) : ""
      }, ${escapeHtml(order.shippingAddress?.postalCode || "")} ${escapeHtml(order.shippingAddress?.city || "")}${order.shippingAddress?.country ? ", " + escapeHtml(order.shippingAddress.country) : ""
      }</b></p>`
      : ""
    }
        </div>
      </div>

      ${itemsHtml}

      <p style="margin:0;color:#444;font-size:13px;">
        Total: <b>${formatMoney(order?.totalAmount || 0)}</b><br/>
        Payment: <b>${escapeHtml(order?.paymentMethod || "-")}</b><br/>
        Shipping: <b>${escapeHtml(order?.shippingMethod || "-")}</b>
      </p>
    </div>
    ${emailFooter()}
  `;

  const html = wrapEmail(inner);

  await transporter.sendMail({
    from: process.env.SHOP_FROM || process.env.SMTP_USER,
    to: process.env.SHOP_ADMIN_EMAIL,
    subject,
    text,
    html,
  });
}

export async function sendAdminEmail(subject, html, opts = {}) {
  if (!process.env.SHOP_ADMIN_EMAIL) return;
  await transporter.sendMail({
    from: process.env.SHOP_FROM || process.env.SMTP_USER,
    to: process.env.SHOP_ADMIN_EMAIL,
    subject,
    html,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
}

export function buildCustomEmailHtml({ subject, html, text, to, unsubscribeToken, includeUnsubscribeLink = false }) {
  const safe = (s = "") =>
    String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const content =
    html && html.trim()
      ? html
      : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#000;">${safe(text || "").replace(/\n/g, "<br/>")}</p>`;

  const unsubscribe =
    unsubscribeToken && includeUnsubscribeLink
      ? `
    <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e5e5e5;">
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 12px;">
        You are receiving this email because you subscribed to the VEYNO newsletter.
      </p>
      <a href="${FRONT}/api/newsletter/unsubscribe?token=${encodeURIComponent(
        unsubscribeToken
      )}"
         style="display:inline-block;padding:10px 20px;border:1px solid #000;color:#000;text-decoration:none;
                font-size:12px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
        Unsubscribe
      </a>
    </div>`
      : "";

  const inner = `
    ${emailHeader()}
    <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      ${content}
      ${unsubscribe}
    </div>
    ${emailFooter()}
  `;
  return wrapEmail(inner);
}

export async function sendNewsletterEmail({ to, subject, html, text, unsubscribeToken }) {
  const wrapped = buildCustomEmailHtml({
    subject,
    html,
    text,
    to,
    unsubscribeToken,
    includeUnsubscribeLink: true,
  });

  return transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: wrapped,
  });
}

export async function sendCustomEmail({ to, subject, html, text }) {
  if (!to || !subject) return;
  const wrapped = buildCustomEmailHtml({ subject, html, text, to });
  await transporter.sendMail({
    from: process.env.SHOP_FROM || `"VEYNO" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: wrapped,
  });
}