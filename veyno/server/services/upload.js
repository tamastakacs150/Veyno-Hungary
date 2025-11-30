//server/services/upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";


const s3 = new S3Client({
region: process.env.S3_REGION,
endpoint: process.env.S3_ENDPOINT, // For R2: https://<accountid>.r2.cloudflarestorage.com
credentials: {
accessKeyId: process.env.S3_KEY,
secretAccessKey: process.env.S3_SECRET,
},
});


export async function uploadBuffer(buf, { ext = ".jpg", prefix = "" } = {}) {
const key = `${prefix}${new Date().toISOString().slice(0,10)}/${randomUUID()}${ext}`;
await s3.send(new PutObjectCommand({
Bucket: process.env.S3_BUCKET,
Key: key,
Body: buf,
ContentType: ext === ".jpg" ? "image/jpeg" : "application/octet-stream",
ACL: "public-read", // Not needed on R2 if the bucket is on a public CDN
}));


// Public URL
const base = process.env.CDN_PUBLIC_BASE || process.env.S3_PUBLIC_BASE;
return `${base}${key}`;
}