// server/utils/validateUrl.js
import dns from "dns";
import { promisify } from "util";
const lookup = promisify(dns.lookup);

// ❌ Tiltott IP tartományok (privát hálók)
const BLOCKED_RANGES = [
  /^127\./,            // localhost
  /^10\./,             // privát háló
  /^192\.168\./,       // privát háló
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // privát háló
  /^169\.254\./,       // link-local
  /^0\./               // invalid
];

// ❌ Csak meghatározott domain engedett
const ALLOWED_DOMAINS = [
  "yourcdn.com",
  "veyno.hu",
  "cdn.veyno.hu"
];

export async function validateSafeUrl(inputUrl) {
  try {
    const url = new URL(inputUrl);

    // 1️⃣ Ellenőrizd: csak https://
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are allowed.");
    }

    // 2️⃣ Domain whitelisting
    const hostname = url.hostname.toLowerCase();
    const whitelisted = ALLOWED_DOMAINS.some(allowed =>
      hostname === allowed || hostname.endsWith("." + allowed)
    );
    if (!whitelisted) {
      throw new Error("URL domain is not allowed.");
    }

    // 3️⃣ DNS lookup → IP cím ellenőrzése
    const result = await lookup(hostname);
    const ip = result.address;

    for (const pattern of BLOCKED_RANGES) {
      if (pattern.test(ip)) {
        throw new Error("Blocked internal IP address range.");
      }
    }

    return true;
  } catch (err) {
    console.error("URL Validation Error:", err.message);
    throw new Error("Unsafe or invalid URL.");
  }
}
