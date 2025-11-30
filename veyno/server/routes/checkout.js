// server/routes/checkout.js
import express from "express";
import Coupon from "../models/Coupon.js";

const router = express.Router();

// POST /api/checkout/coupons/validate { code, orderTotal }
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, orderTotal = 0 } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, reason: "MISSING_CODE" });

    const doc = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
    if (!doc) return res.status(404).json({ valid: false, reason: "NOT_FOUND" });

    if (!doc.isCurrentlyValid(Number(orderTotal))) {
      return res.json({ valid: false, reason: "NOT_ELIGIBLE" });
    }

    // return the discount for this amount
    let discountAmount = 0;
    if (doc.discountType === "percentage") {
      discountAmount = Math.max(0, Math.round(Number(orderTotal) * (doc.discountValue / 100)));
    } else {
      discountAmount = Math.max(0, Math.round(doc.discountValue));
    }

    res.json({
      valid: true,
      coupon: {
        id: String(doc._id),
        code: doc.code,
        discountType: doc.discountType,     // "percentage" | "fixed"
        discountValue: doc.discountValue,
      },
      discountAmount,
      message: doc.discountType === "percentage"
        ? `Coupon redeemed: ${doc.discountValue}% discount.`
        : `Coupon redeemed: ${doc.discountValue} Ft discount.`,
    });
  } catch (e) {
    console.error("validate coupon error:", e);
    res.status(500).json({ valid: false, reason: "SERVER_ERROR" });
  }
});

export default router;
