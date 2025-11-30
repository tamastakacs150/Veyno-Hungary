//server/models/Coupon.js
import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true }, // UI: "percentage" | "fixed"
    discountValue: { type: Number, required: true, min: 0 },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    minPurchase: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: 0, min: 0 },   // 0 = unlimited
    currentUses: { type: Number, default: 0, min: 0 },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CouponSchema.methods.isCurrentlyValid = function (orderTotal = 0) {
  if (!this.active) return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  if (this.maxUses && this.currentUses >= this.maxUses) return false;
  if (this.minPurchase && orderTotal < this.minPurchase) return false;
  return true;
};

export default mongoose.model("Coupon", CouponSchema);
