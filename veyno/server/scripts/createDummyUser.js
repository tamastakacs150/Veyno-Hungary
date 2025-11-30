import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

const run = async () => {
    try {
        const user = new User({
            name: "Test User",       // <- REQUIRED FIELD
            email: "test@example.com",
            password: "hashedpassword", // just dummy, will not be used
            cart: []
        });

        await user.save();
        console.log("Dummy user created:", user._id);

        mongoose.disconnect();
    } catch (err) {
        console.error("❌ Error:", err);
        mongoose.disconnect();
    }
};

run();
