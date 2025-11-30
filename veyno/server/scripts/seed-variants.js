// seed-variants.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";

dotenv.config();

const SIZES = ["S", "M", "L", "XL"];
const DEFAULT_STOCK = 10;

async function run() {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/webshop";
    await mongoose.connect(uri);
    console.log("Mongo connected");

    const products = await Product.find({});
    let updated = 0;

    for (const p of products) {
        // if there are already variants, skip them
        if (Array.isArray(p.variants) && p.variants.length > 0) continue;

        p.variants = SIZES.map((s) => ({
            size: s,
            stock: typeof p.stock === "number" && p.stock > 0 ? p.stock : DEFAULT_STOCK,
            sku: p.sku ? `${p.sku}-${s}` : "",
            priceOverride: null,
        }));

        await p.save();
        updated++;
    }

    console.log(`Ready. Updated products: ${updated}`);
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
