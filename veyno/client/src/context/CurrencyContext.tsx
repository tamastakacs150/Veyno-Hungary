// src/context/CurrencyContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Currency = "HUF" | "EUR" | "USD";
type Rates = Record<Currency, number>;

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  convert: (amountInBase: number, to?: Currency) => number;
  format: (amountInBase: number, to?: Currency) => string;
  formatOnly: (amount: number, to?: Currency) => string;
};

const STORAGE_KEY = "CURRENCY_V2";
const DEFAULT_CURRENCY: Currency = "USD";
const isCurrency = (v: any): v is Currency => v === "HUF" || v === "EUR" || v === "USD";

const CurrencyContext = createContext<Ctx | null>(null);

// Display formatter: HUF without decimals; EUR and USD rounded to the nearest whole number
const _formatInternal = (val: number, to: Currency) => {
  const locales: Record<Currency, string> = { HUF: "hu-HU", EUR: "de-DE", USD: "en-US" };
  try {
    if (to === "HUF") {
      return new Intl.NumberFormat(locales[to], {
        style: "currency",
        currency: to,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (to === "EUR" || to === "USD") {
      return new Intl.NumberFormat(locales[to], {
        style: "currency",
        currency: to,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(val));
    }
    return `${Math.round(val)} ${to}`;
  } catch {
    return `${Math.round(val)} ${to}`;
  }
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Default selected currency: USD (preserved with new key)
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) || null) as Currency | null;
    return isCurrency(saved) ? saved : DEFAULT_CURRENCY;
  });

  // Initial (fallback) exchange rates with USD base
  const initialRates: Rates = { USD: 1, EUR: 0.92, HUF: 370 };
  const [rates, setRates] = useState<Rates>(initialRates);

  // Storage update + clean up old key
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
    if (localStorage.getItem("CURRENCY")) {
      localStorage.removeItem("CURRENCY");
    }
  }, [currency]);

  // Retrieve live exchange rates from the server (assuming USD base)
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((d) => {
        if (
          d?.rates &&
          typeof d.rates === "object" &&
          typeof d.rates.USD === "number" &&
          typeof d.rates.EUR === "number" &&
          typeof d.rates.HUF === "number"
        ) {
          const newRates: Rates = { USD: d.rates.USD, EUR: d.rates.EUR, HUF: d.rates.HUF };
          setRates(newRates);
        } else {
          console.warn("Invalid or incomplete rates received from /api/rates. Using initial fallback rates.");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch rates from /api/rates:", error);
      });
  }, []);

  // Conversion: amountInBase in USD, to the selected currency
  const convert = (amountInBase: number, to: Currency = currency) => {
    const rate = rates[to] ?? 1;
    return Number(amountInBase) * rate;
  };

  // Formatted output: display the selected currency from a USD-based amount
  const format = (amountInBase: number, to: Currency = currency) => {
    const val = convert(amountInBase, to);
    return _formatInternal(val, to);
  };

  // Formatting only
  const formatOnly = (amount: number, to: Currency = currency) => {
    return _formatInternal(amount, to);
  };

  const value = useMemo<Ctx>(
    () => ({ currency, setCurrency, rates, convert, format, formatOnly }),
    [currency, rates]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
