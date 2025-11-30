//server/models/Order.js
import mongoose from "mongoose";

/**
* Order schema with unit price recording.
* - items[].unitPrice: valid (discounted) unit price at the time of the order
* - items[].originalPrice: the full price (without discount), for audit/comparison
* - items[].discountLabel: optional label (e.g. discount name)
* We keep the previous AddressSchema and orderNumber generation.
*/

// Generate a unique order number (e.g. WS-20250921-AB12CD)
function genOrderNumber() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `WS-${y}${m}${day}-${rand}`;
}

// Uniform address scheme (shipping/billing)
const AddressSchema = new mongoose.Schema(
    {
        country: { type: String, default: "HU", trim: true },
        postalCode: { type: String, default: "", trim: true },
        city: { type: String, default: "", trim: true },
        line1: { type: String, default: "", trim: true }, // street, house number
        line2: { type: String, default: "", trim: true }, // floor/door (optional)
    },
    { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        size: { type: String, enum: ["S", "M", "L", "XL"], default: null },
        name: { type: String, default: "" },            // product name when ordering
        image: { type: String, default: "" },           // main image path when ordering
        sku: { type: String, default: "" },             // SKU when ordering

        quantity: { type: Number, default: 1, min: 1, required: true },

        // Price snapshots (REQUIRED – we record the moment of the order)
        unitPrice: { type: Number, required: true, min: 0 },      // actual unit price (on sale)
        originalPrice: { type: Number, required: true, min: 0 },  // full price without discount
        discountLabel: { type: String, default: "" },             // e.g. "Autumn sale"
        lineTotal: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

        // Unique order number
        orderNumber: { type: String, unique: true, index: true },

        // Items
        items: { type: [OrderItemSchema], default: [] },

        // Amounts
        subtotal: { type: Number, default: 0 },     // sum of items (unitPrice * qty or sum of lineTotals)
        discount: { type: Number, default: 0 },     // coupon discount in HUF (optional)
        shippingCost: { type: Number, default: 0 }, // shipping fee
        totalAmount: { type: Number, default: 0 },  // total (subtotal - discount + shippingCost)

        // Customer and addresses
        customer: {
            name: String,
            email: String,
            phone: String,   // comes from checkout
            address: String, // legacy (left due to old structure)
        },

        shippingAddress: { type: AddressSchema, default: null },
        billingAddress: { type: AddressSchema, default: null },

        // Coupon
        coupon: { type: String, default: null }, // pl. "VEYNO10"

        // Shipping/payment
        shippingMethod: String,
        paymentMethod: String,

        // Statuses and tracking
        status: { type: String, default: "pending", index: true }, // "pending" | "paid" | "shipped" | "delivered" | "cancelled" ...
        courier: String,
        trackingNumber: String,
        trackingUrl: String,
        estimatedDelivery: Date,

        // Payment/communication meta
        stripeSessionId: String,
        emailSent: { type: Boolean, default: false },

        // Misc
        note: String, // comment from checkout
    },
    { timestamps: true }
);

// Generate order number if none exists yet
OrderSchema.pre("validate", async function (next) {
    if (this.orderNumber) return next();
    const Model = this.constructor;

    for (let i = 0; i < 5; i++) {
        const candidate = genOrderNumber();
        const exists = await Model.exists({ orderNumber: candidate });
        if (!exists) {
            this.orderNumber = candidate;
            return next();
        }
    }
    // there is a very small chance that it would collide 5× → fallback
    this.orderNumber = `WS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    next();
});

// Indexes for more common queries
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
