// server/set-sale.mjs
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

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

const args = parseArgs();

const ID = args.id || args._id;
const TYPE = (args.type || 'percent').toLowerCase(); // 'percent' | 'amount'
const VALUE = Number(args.value ?? NaN);
const LABEL = args.label ?? '';
const START = args.start ? new Date(args.start) : null;
const END = args.end ? new Date(args.end) : null;

if (!ID) fail('The --id parameter (product _id) is missing.');
if (!['percent', 'amount'].includes(TYPE)) fail("--type can only be 'percent' or 'amount'.");
if (Number.isNaN(VALUE) || VALUE < 0) fail('--value must be a non-negative number.');
if (START && isNaN(START.getTime())) fail('--start is not a valid ISO date.');
if (END && isNaN(END.getTime())) fail('--end is not a valid ISO date.');
if (START && END && START > END) fail('--start cannot be later than --end.');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  'mongodb://127.0.0.1:27017/webshop';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const update = {
    'sale.active': true,
    'sale.type': TYPE,
    'sale.value': VALUE,
    'sale.label': LABEL,
    'sale.startAt': START,
    'sale.endAt': END,
  };
  const doc = await Product.findByIdAndUpdate(ID, { $set: update }, { new: true });
  if (!doc) fail('There is no such product _id.');
  console.log('Sale set');
  // The virtual fields (effectivePrice, discountPercent) are displayed during to JSON:
  console.log(JSON.stringify(doc.toJSON(), null, 2));
}

main()
  .catch((e) => {
    console.error('Error:', e?.message || e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
