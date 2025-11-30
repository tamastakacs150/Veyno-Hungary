//server/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const CartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 1 },
    size: { type: String, default: null },
}, { _id: false });

const AddressSchema = new mongoose.Schema({
    country: { type: String, default: "HU", trim: true },
    postalCode: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
}, { _id: false });

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },

        //Is this a verified user?
        verified: { type: Boolean, default: false },
        verifyToken: { type: String, default: null },

        verificationExpiresAt: { type: Date, default: null },

        // Password is only required if NOT a Google account (no googleId)
        password: {
            type: String,
            required: function () { return !this.googleId; },
            // Don't allow an empty string for "has password"
            set: function (val) { return (val && val.length > 0) ? val : undefined; },
        },

        googleId: { type: String, index: true, default: null },
        provider: { type: String, enum: ["local", "google"], default: "local" },

        // ---- profile data for checkout prefilling ----
        phone: { type: String, default: "" },
        defaultAddress: { type: AddressSchema, default: null },

        // Optional: marketing preference
        newsletterOptIn: { type: Boolean, default: false },
        
        //Admin id
        role: { type: String, enum: ["user", "admin"], default: "user" },

        // Cart and favorites – the existing structure remains
        cart: [CartItemSchema],
        favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

        // Reset/password meta
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
        passwordChangedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc, ret) {
               // extract sensitive fields from the client response
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                delete ret.__v;
                return ret;
            },
        },
        toObject: { virtuals: true },
    }
);

UserSchema.index({ verificationExpiresAt: 1 }, { expireAfterSeconds: 0 });

/** Hash password only if it has actually changed and a password is provided */
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        this.passwordChangedAt = new Date();
        next();
    } catch (err) {
        next(err);
    }
});

/** Optional helper for password verification */
UserSchema.methods.comparePassword = async function (plain) {
    if (!this.password) return false;
    return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", UserSchema);