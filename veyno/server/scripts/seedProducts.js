// server/seedProducts.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const products = [
    { name: 'Shirt', price: 50, image: '/shirt.jpg' },
    { name: 'Jacket', price: 100, image: '/jacket.jpg' },
    { name: 'Pullover', price: 60, image: '/pullover.jpg' },
];

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        await Product.deleteMany({});
        await Product.insertMany(products);
        console.log('Products uploaded in UTF-8!');
        process.exit();
    })
    .catch(err => console.error(err));
