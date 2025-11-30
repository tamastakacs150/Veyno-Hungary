//server/models/NewsletterLog.js
import mongoose from "mongoose";

const NewsletterLogSchema = new mongoose.Schema({
  to: { type: String, index: true },
  subject: String,
  campaignId: { type: String, index: true }, // optional
  sentAt: { type: Date, default: Date.now, index: true },
  opens: [{ type: Date }], // tracking pixel
}, { timestamps: true });

export default mongoose.model("NewsletterLog", NewsletterLogSchema);
