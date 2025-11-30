//server/models/EmaiLog.js
import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema(
  {
    to: { type: String, index: true, required: true, lowercase: true, trim: true },
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    text: { type: String, default: "" },
    context: { type: String, default: "custom" },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("EmailLog", EmailLogSchema);
