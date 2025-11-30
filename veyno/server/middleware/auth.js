// server/middleware/auth.js
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function authMiddleware(req, res, next) {
  try {
    let token = null;

    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) token = header.slice(7);

    if (!token && req.cookies) token = req.cookies.access_token || req.cookies.token || null;

    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // The payload contains: { id, email, role }
    req.user = payload;
    req.userId = payload.id;
    next();
  } catch (err) {
    console.error("authMiddleware error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
