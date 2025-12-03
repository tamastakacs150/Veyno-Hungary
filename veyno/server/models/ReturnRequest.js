// server/models/ReturnRequest.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const ReturnRequestSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "received", "refunded"],
      default: "pending",
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ReturnRequest", ReturnRequestSchema);
