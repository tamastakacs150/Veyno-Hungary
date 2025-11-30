// server/routes/cart.js
import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// --- Auth: Retrieve cart for logged in user ---
router.get("/", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate("cart.productId");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            username: user.name,
            cart: user.cart,
        });
    } catch (err) {
        console.error("❌ Error when querying the cart:", err);
        res.status(500).json({ error: "Error retrieving cart." });
    }
});

// --- Add to cart ---
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { productId, quantity, size = null } = req.body;

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Check if the same product already exists WITH THE SAME SIZE
        const existingItem = user.cart.find(
            item => item.productId.toString() === productId && String(item.size || "") === String(size || "")
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({ productId, quantity, size });
        }

        await user.save();
        await user.populate("cart.productId");

        res.json({
            message: "Cart updated",
            cart: user.cart,
        });
    } catch (err) {
        console.error("❌ Error updating cart:", err);
        res.status(500).json({ error: "Error updating cart." });
    }
});

// --- Remove from cart ---
router.post("/remove", authMiddleware, async (req, res) => {
    try {
        const { productId, size = null } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.cart = user.cart.filter(item =>
            !(item.productId.toString() === productId && String(item.size || "") === String(size || ""))
        );

        await user.save();
        await user.populate("cart.productId");

        res.json({
            message: "Product removed from cart",
            cart: user.cart,
        });
    } catch (err) {
        console.error("❌ Error while removing product:", err);
        res.status(500).json({ error: "Error removing product." });
    }
});

export default router;
