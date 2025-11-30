// src/utils/rates.js

export async function getRates() {
  const fallbackRates = { HUF: 1, EUR: 0.0026, USD: 0.0028 };
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=HUF");
    
    // 1. Check the HTTP status
    if (!res.ok) {
        throw new Error(`External API status not ok: ${res.status}`);
    }
    
    const data = await res.json();
    
    // 2. Check the response structure
    const rates = data?.rates;
    if (
        !rates || 
        typeof rates !== 'object' || 
        typeof rates.EUR !== 'number' || 
        typeof rates.USD !== 'number'
    ) {
        throw new Error("Invalid or incomplete rates structure received from external API.");
    }
    
    // We ensure that HUF is included in the exchange rates (which is 1 according to the API)
    rates.HUF = rates.HUF ?? 1;

    return rates; // e.g. { HUF: 1, EUR: 0.0026, USD: 0.0028 }
  } catch (error) {
    console.error("Failed to fetch live rates from external API. Using fallback.", error.message);
    return fallbackRates; // fallback
  }
}