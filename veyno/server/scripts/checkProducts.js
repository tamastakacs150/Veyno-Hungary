import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const products = await Product.find();
        console.log('Products in the database:');
        console.log(products);
        process.exit();
    })
    .catch(err => console.error(err));
