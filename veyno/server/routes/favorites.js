// server/routes/favorites.js
import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// simple requireAuth works the same with cookies and Bearer tokens
function requireAuth(req, res, next) {
  try {
    let token = null;
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) token = h.slice(7);
    if (!token && req.cookies) token = req.cookies.access_token || req.cookies.token || null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// GET /favorites current list
router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).populate("favorites");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ favorites: user.favorites });
});

// POST /favorites/toggle add/remove
router.post("/toggle", requireAuth, async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ error: "productId required" });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const idx = user.favorites.findIndex(id => String(id) === String(productId));
  if (idx === -1) user.favorites.push(productId);
  else user.favorites.splice(idx, 1);

  await user.save();
  await user.populate("favorites");
  res.json({ favorites: user.favorites });
});

export default router;
