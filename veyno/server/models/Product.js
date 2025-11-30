//server/models/Product.js
import mongoose from "mongoose";

/**
* Product schema with sale fields and virtual, discounted price.
* - price: base price (HUF)
* - sale: sale settings (percent/amount, timing)
* - effectivePrice (virtual): the currently valid price (taking into account the sale)
* - discountPercent (virtual): % discount calculated for display
*/

const ProductSchema = new mongoose.Schema(
    {
        // --- BASIC FIELDS ---
        sku: { type: String, required: true, unique: true, trim: true },
        brand: { type: String, required: true, index: true, trim: true },
        category: { type: String, required: true, index: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        description: { type: String, default: "" },

        imageFolder: { type: String, required: true, trim: true },
        images: { type: [String], default: [] },                   // eg. ["1.jpg","2.jpg","3.jpg"]

        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },

        slug: { type: String, required: true, index: true, trim: true },
        stock: { type: Number, default: 0, min: 0 },
        variants: [{
            size: { type: String, enum: ["S", "M", "L", "XL"], required: true },
            stock: { type: Number, default: 0 },
            sku: { type: String, default: "" },
            priceOverride: { type: Number, default: null }
        }],

        image: { type: String, default: "" },

       // --- SALE FIELDS ---
        sale: {
            active: { type: Boolean, default: false, index: true },
            /**
             * percent  -> value: 20  => -20%
             * amount   -> value: 2000 => -2000 Ft
             */
            type: { type: String, enum: ["percent", "amount"], default: "percent" },
            value: { type: Number, default: 0, min: 0 },
            startAt: { type: Date, default: null },
            endAt: { type: Date, default: null },
            label: { type: String, default: "" }, // e.g. "Autumn sale"
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Helper: is action active NOW?
function isSaleActive(doc) {
    if (!doc?.sale?.active) return false;
    const now = new Date();
    if (doc.sale.startAt && now < doc.sale.startAt) return false;
    if (doc.sale.endAt && now > doc.sale.endAt) return false;
    return (doc.sale.value ?? 0) > 0;
}

// Virtual: effective price (discounted price, rounded to whole HUF in case of percent)
ProductSchema.virtual("effectivePrice").get(function () {
    const base = this.price ?? 0;
    if (!isSaleActive(this)) return base;

    if (this.sale.type === "percent") {
        const discounted = Math.round(base * (100 - this.sale.value) / 100);
        return Math.max(0, discounted);
    }
    // "amount"
    return Math.max(0, base - this.sale.value);
});

// Virtual: discount % (for display)
ProductSchema.virtual("discountPercent").get(function () {
    const base = this.price ?? 0;
    if (!base || !isSaleActive(this)) return 0;
    const eff = this.effectivePrice;
    return Math.round((1 - eff / base) * 100);
});

// Small protective validation when saving
ProductSchema.pre("save", function (next) {
    if (this.sale?.type === "amount" && this.sale?.value > this.price) {
        this.sale.value = this.price;
    }
    if (this.sale?.startAt && this.sale?.endAt && this.sale.startAt > this.sale.endAt) {
        // swap if they were accidentally entered backwards
        const tmp = this.sale.startAt;
        this.sale.startAt = this.sale.endAt;
        this.sale.endAt = tmp;
    }
    next();
});

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
