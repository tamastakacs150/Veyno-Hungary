//server/middleware/requireAdmin.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function requireAdmin(req, res, next) {
  try {
    // 1) token from cookie
    let token = req.cookies?.access_token || null;

    // 2) if there is no cookie, look at the Authorization header
    if (!token) {
      const auth = req.headers.authorization || req.headers.Authorization || "";
      if (auth.startsWith("Bearer ")) token = auth.slice(7);
    }

    if (!token) {
      // No token: 404 (hide endpoint from bots)
      return res.status(404).json({ error: "Not found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id role");
    if (!user || user.role !== "admin") {
      // There is a token, but not an admin: same 404
      return res.status(404).json({ error: "Not found" });
    }

    req.user = { id: String(user._id), role: user.role };
    next();
  } catch {
    // Invalid/expired token: 404
    return res.status(404).json({ error: "Not found" });
  }
}
