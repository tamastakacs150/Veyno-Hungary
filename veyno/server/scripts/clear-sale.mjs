// server/clear-sale.mjs
import 'dotenv/config.js';
import mongoose from 'mongoose';
import Product from './models/Product.js';

function parseArgs() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const val = a[i + 1]?.startsWith('--') || a[i + 1] == null ? true : a[++i];
    out[key] = val;
  }
  return out;
}

const args = parseArgs();
const ID = args.id || args._id;
if (!ID) {
  console.error('The --id parameter (product _id) is missing.');
  process.exit(1);
}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  'mongodb://127.0.0.1:27017/webshop';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const update = {
    'sale.active': false,
    'sale.type': 'percent',
    'sale.value': 0,
    'sale.label': '',
    'sale.startAt': null,
    'sale.endAt': null,
  };
  const doc = await Product.findByIdAndUpdate(ID, { $set: update }, { new: true });
  if (!doc) {
    console.error('There is no such product _id.');
    process.exit(1);
  }
  console.log('Sale turned off');
  console.log(JSON.stringify(doc.toJSON(), null, 2));
}

main()
  .catch((e) => {
    console.error('Error:', e?.message || e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
