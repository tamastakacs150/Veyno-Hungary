//server/models/Newsletter.js
import mongoose from "mongoose";

const NewsletterSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Incorrect e-mail format"],
        },
        unsubscribeToken: {
            type: String,
            index: true,
        },
        unsubscribeTokenExpiresAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Newsletter", NewsletterSchema);
