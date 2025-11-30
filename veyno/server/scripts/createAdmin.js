// server/scripts/createAdmin.js
import "dotenv/config.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrator";

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before running createAdmin.js");
  }

  let admin = await User.findOne({ email });

  if (admin) {
    admin.role = "admin";
    admin.password = password;
    admin.verified = true;
    admin.verifyToken = null;
    admin.verificationExpiresAt = null;
    admin.defaultAddress = null;
    admin.favorites = [];
    admin.cart = [];
    admin.phone = "";
    admin.provider = "local";
    admin.passwordChangedAt = new Date();

    await admin.save();
    console.log(`Existing admin updated: ${email}`);
  } else {
    admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      verified: true,
      verifyToken: null,
      verificationExpiresAt: null,
      googleId: null,
      provider: "local",
      phone: "",
      defaultAddress: null,
      newsletterOptIn: false,
      favorites: [],
      cart: [],
      passwordChangedAt: new Date(),
    });

    console.log(`Admin user created: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});