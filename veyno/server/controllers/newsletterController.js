//server/controllers/newsletterController.js
import Newsletter from "../models/Newsletter.js";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { sendWelcomeEmail, sendNewsletterEmail, buildCustomEmailHtml } from "../mailer/mailer.js";
import NewsletterLog from "../models/NewsletterLog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Helper functions ----
function resolveTemplatePath(name) {
  if (!name || /(\.\.|[\/\\])/g.test(name)) throw new Error("Invalid template name");
  const dir = path.resolve(__dirname, "../newsletter-templates");
  return {
    jsonPath: path.join(dir, `${name}.json`),
    htmlPath: path.join(dir, `${name}.html`),
  };
}

function generateUnsubscribeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function applyReplacements(s, map) {
  if (!s) return s;
  return Object.keys(map).reduce((acc, k) => acc.split(k).join(map[k]), s);
}

async function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function status(req, res) {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        subscribed: false,
        error: "Not authenticated",
      });
    }

    const found = await Newsletter.findOne({
      email: String(email).trim().toLowerCase(),
    }).lean();

    return res.json({ subscribed: Boolean(found) });
  } catch (err) {
    console.error("Newsletter status error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
}

// ---- Endpoints ----
export async function subscribe(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const normalized = String(email).trim().toLowerCase();
    const unsubscribeToken = generateUnsubscribeToken();

    await Newsletter.create({
      email: normalized,
      unsubscribeToken,
      unsubscribeTokenExpiresAt: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365 * 5
      ), // pl. 5 év
    });

    // Welcome email with coupon
    await sendWelcomeEmail(normalized);

    return res.json({ msg: "Successful subscription! Coupon code sent via e-mail." });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ msg: "You are already subscribed!" });
    }
    return res.status(500).json({ msg: "Error saving" });
  }
}


export async function listAll(_req, res) {
  const docs = await Newsletter.find().sort({ createdAt: -1 });
  res.json(docs);
}

export async function sendNewsletter(req, res) {
  try {
    const { subject, html, text, campaignId } = req.body || {};
    if (!subject || (!html && !text))
      return res.status(400).json({ msg: "Subject and content are mandatory" });

    const subs = await Newsletter.find().select(
      "email unsubscribeToken unsubscribeTokenExpiresAt"
    ).lean();

    if (!subs.length) return res.json({ msg: "There are no subscribers" });

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    let ok = 0, fail = 0;

    for (const sub of subs) {
      const email = String(sub.email).toLowerCase();

      try {
        let token = sub.unsubscribeToken;
        const now = new Date();
        const expired =
          sub.unsubscribeTokenExpiresAt &&
          sub.unsubscribeTokenExpiresAt <= now;

        if (!token || expired) {
          token = generateUnsubscribeToken();
          await Newsletter.updateOne(
            { _id: sub._id },
            {
              $set: {
                unsubscribeToken: token,
                unsubscribeTokenExpiresAt: new Date(
                  Date.now() + 1000 * 60 * 60 * 24 * 365 * 5
                ),
              },
            }
          );
        }

        const log = await NewsletterLog.create({
          to: email,
          subject,
          campaignId,
        });

        const htmlWithPixel = html
          ? `${html}<img src="${base}/api/newsletter/open/${log._id}" width="1" height="1" style="display:block;opacity:0" alt="">`
          : undefined;

        await sendNewsletterEmail({
          to: email,
          subject,
          html: htmlWithPixel,
          text,
          unsubscribeToken: token,
        });

        ok++;
      } catch {
        fail++;
      }
    }

    return res.json({ msg: "Newsletter sent", ok, fail, total: subs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Sending error" });
  }
}

// ---- NEW: preview + send from file ----
export async function sendFromFile(req, res) {
  try {
    const name = String(req.body.template || "").trim();
    if (!name) return res.status(400).json({ msg: "template name required" });

    const { jsonPath, htmlPath } = resolveTemplatePath(name);

    let subject = req.body.subject || "";
    let html = "";
    let text = "";

    try {
      const raw = await fs.readFile(jsonPath, "utf8");
      const data = JSON.parse(raw);
      subject = data.subject || subject;
      html = data.html || "";
      text = data.text || "";
    } catch {
      try {
        html = await fs.readFile(htmlPath, "utf8");
      } catch {
        return res.status(404).json({ msg: "Template not found (.json or .html)" });
      }
    }

    if (!subject) return res.status(400).json({ msg: "subject missing (Enter it in JSON or body)" });
    if (!html && !text) return res.status(400).json({ msg: "html or text required" });

    const vars = (req.body && typeof req.body.vars === "object") ? req.body.vars : {};
    if (req.body.coupon || req.body.couponCode) {
      vars.COUPON = req.body.coupon || req.body.couponCode;
    }
    const replacements = Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [`{{${String(k)}}}`, String(v ?? "")])
    );
    replacements["{{YEAR}}"] = new Date().getFullYear().toString();
    html = applyReplacements(html, replacements);
    text = applyReplacements(text, replacements);

    const subs = await Newsletter.find().select(
      "email unsubscribeToken unsubscribeTokenExpiresAt"
    ).lean();

    if (!subs.length) return res.json({ msg: "There are no subscribers" });

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    let ok = 0, fail = 0;

    for (const sub of subs) {
      const email = String(sub.email).toLowerCase();

      try {
        let token = sub.unsubscribeToken;
        const now = new Date();
        const expired =
          sub.unsubscribeTokenExpiresAt &&
          sub.unsubscribeTokenExpiresAt <= now;

        if (!token || expired) {
          token = generateUnsubscribeToken();
          await Newsletter.updateOne(
            { _id: sub._id },
            {
              $set: {
                unsubscribeToken: token,
                unsubscribeTokenExpiresAt: new Date(
                  Date.now() + 1000 * 60 * 60 * 24 * 365 * 5
                ),
              },
            }
          );
        }

        const log = await NewsletterLog.create({
          to: email,
          subject,
          campaignId: req.body.campaignId || req.query?.campaignId || undefined,
        });

        const htmlWithPixel = html
          ? `${html}<img src="${base}/api/newsletter/open/${log._id}" width="1" height="1" style="display:block;opacity:0" alt="">`
          : undefined;

        await sendNewsletterEmail({
          to: email,
          subject,
          html: htmlWithPixel,
          text,
          unsubscribeToken: token,
        });

        ok++;
      } catch {
        fail++;
      }
    }

    return res.json({ msg: "Newsletter sent", ok, fail, total: subs.length });
  } catch (err) {
    console.error("sendFromFile error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
}

export async function previewFromFile(req, res) {
  try {
    const name = String(req.query.template || "").trim();
    if (!name) return res.status(400).json({ msg: "template parameter required" });

    const { jsonPath, htmlPath } = resolveTemplatePath(name);

    let subject = "", html = "", text = "";

    try {
      const raw = await fs.readFile(jsonPath, "utf8");
      const data = JSON.parse(raw);
      subject = data.subject || "";
      html = data.html || "";
      text = data.text || "";
    } catch {
      try {
        html = await fs.readFile(htmlPath, "utf8");
      } catch {
        return res.status(404).json({ msg: "Template not found (.json or .html)" });
      }
    }

    // If wrapped=1 -> full, VEYNO-wrapped HTML page (with unsubscribe button)
    if (String(req.query.wrapped || "") === "1") {
      const wrapped = buildCustomEmailHtml({
        subject: subject || "Preview",
        html,
        text,
        to: "preview@example.com",
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(wrapped);
    }

    // Default: JSON (backwards compatible)
    return res.json({ subject, html, text });
  } catch (err) {
    console.error("previewFromFile error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
}

export async function unsubscribe(req, res) {
  try {
    const token =
      (req.query && req.query.token) ||
      (req.body && req.body.token);

    if (!token) {
      return res.status(400).json({ error: "Unsubscribe token required" });
    }

    const now = new Date();
    const doc = await Newsletter.findOneAndDelete({
      unsubscribeToken: String(token),
      $or: [
        { unsubscribeTokenExpiresAt: { $exists: false } },
        { unsubscribeTokenExpiresAt: { $gt: now } },
      ],
    });

    const wantsJson =
      req.xhr ||
      req.headers["content-type"]?.includes("application/json");

    if (!doc) {
      if (wantsJson) {
        return res
          .status(404)
          .json({ error: "Subscription not found or token expired" });
      }
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5555";
      return res.redirect(
        `${frontendUrl}/unsubscribed-successfully?status=not-found`
      );
    }

    if (wantsJson) {
      return res.json({ msg: "Unsubscribed successfully" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5555";
    return res.redirect(`${frontendUrl}/unsubscribed-successfully`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
