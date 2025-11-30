// server/routes/rates.js
import express from "express";
const router = express.Router();

async function getServerRates() {
  const fallbackRates = { USD: 1, EUR: 0.92, HUF: 370 };
  try {
    // USD is the base, the rest are the relative exchange rates
    const url = "https://api.frankfurter.app/latest?from=USD&to=EUR,HUF";
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`External API status not ok: ${res.status}`);

    const data = await res.json();
    const eur = Number(data?.rates?.EUR);
    const huf = Number(data?.rates?.HUF);

    if (!Number.isFinite(eur) || !Number.isFinite(huf)) {
      throw new Error("External API returned incomplete or invalid rates structure");
    }

    // We always round prices to the nearest whole number for display purposes.
    return {
      USD: 1,
      EUR: Math.round(eur),
      HUF: Math.round(huf)
    };
  } catch (error) {
    console.error("Error fetching live rates on server, using fallback:", error.message);
    return fallbackRates;
  }
}

router.get("/", async (_req, res) => {
  try {
    const ratesData = await getServerRates();
    res.json({ base: "USD", rates: ratesData, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Error handling /api/rates:", err);
    res.status(500).json({ error: "Failed to process exchange rates request." });
  }
});

export default router;
