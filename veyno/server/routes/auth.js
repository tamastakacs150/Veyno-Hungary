// server/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "node:crypto";
import { sendVerificationEmail } from "../utils/mailer.js";

const router = express.Router();

// REGISTRATION
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        if (!name || !email || !password)
            return res.status(400).json({ error: "Missing data." });

        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "Email already registered." });

        const verifyToken = crypto.randomBytes(32).toString("hex");

        const user = await User.create({
            name,
            email,
            password,
            cart: [],
            verifyToken,
        });

        await user.save();

        await sendVerificationEmail({to: email, name, token: verifyToken});

        res.json({
            ok: true,
            message: "Verification email sent. Please check your inbox.",
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Registration failed." });
    }
});

router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verifyToken: token });
    if (!user) return res.status(400).json({ error: "Invalid or expired token." });

    user.verified = true;
    user.verifyToken = null;
    await user.save();

    res.json({ ok: true, message: "Email successfully verified." });
  } catch (err) {
    res.status(500).json({ error: "Verification failed." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!user.verified) {
            return res.status(403).json({ error: "Please verify your email address before logging in." });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "email/password incorrect" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "email/password incorrect" });

        const token = jwt.sign(
            { id: user._id.toString(), name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error("auth/login error:", err);
        res.status(500).json({ error: "Server error at login" });
    }
});

export default router;
