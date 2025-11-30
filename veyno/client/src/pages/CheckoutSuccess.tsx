//client/src/pages/CheckoutSuccess.tsx
import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Package, Home, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/context/CurrencyContext";
import resolveImg, { candidatesFor } from "../utils/resolveImg.js";

const API_URL = import.meta.env?.VITE_API_URL || "/api";

type OrderItem = {
  _id?: string;
  productId?: any;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  originalPrice?: number;
  lineTotal?: number;
  size?: string;
};

type Order = {
  _id?: string;
  orderNumber?: string;
  orderId?: string;
  items?: OrderItem[];
  customer?: { email?: string };
  coupon?: string;
  couponCode?: string;
  discount?: number;
  shippingCost?: number;
  shippingMethod?: string;
};

export default function CheckoutSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { format, rates } = useCurrency();

  /* 1) Page title */
  useEffect(() => {
    const prev = document.title;
    document.title = "Thank you for your order!";
    return () => {
      document.title = prev;
    };
  }, []);

  /* 2) Empty the cart (local + server) */
  useEffect(() => {
    const FLAG = `checkout_cart_cleared:${order?._id || "unknown"}`;
    if (sessionStorage.getItem(FLAG)) return;

    // local cart
    try {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cart-updated"));
    } catch {}

    // server-side cart emptying (if logged in)
    try {
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`${API_URL}/me/cart/clear`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}

    sessionStorage.setItem(FLAG, "1");
  }, [order?._id]);

  /* 3) Load order based on query param (+ fallback to cache, + by-session route) */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramId =
      params.get("orderId") || params.get("oid") || params.get("session_id");

    async function load() {
      setLoading(true);
      try {
        if (paramId) {
          // /orders/:id
          const r = await fetch(
            `${API_URL}/orders/${encodeURIComponent(paramId)}`,
            { credentials: "include" }
          );
          if (r.ok) {
            const data = await r.json();

            // Merge with previously saved coupon/discount/shippingCost fields
            let cached: any = null;
            try {
              cached = JSON.parse(sessionStorage.getItem("lastOrder") || "null");
            } catch {}

            const merged: Order = {
              ...(data || {}),
              coupon:
                data?.coupon ??
                data?.couponCode ??
                cached?.coupon ??
                null,
              discount:
                typeof data?.discount === "number"
                  ? data.discount
                  : typeof cached?.discount === "number"
                  ? cached.discount
                  : 0,
              shippingCost:
                typeof data?.shippingCost === "number"
                  ? data.shippingCost
                  : typeof cached?.shippingCost === "number"
                  ? cached.shippingCost
                  : 0,
            };

            setOrder(merged);
            try {
              sessionStorage.setItem("lastOrder", JSON.stringify(merged));
            } catch {}
            setLoading(false);
            return;
          }

          // /orders/by-session/:session_id if session_id is present
          const sid = params.get("session_id");
          if (sid) {
            const r2 = await fetch(
              `${API_URL}/orders/by-session/${encodeURIComponent(sid)}`,
              { credentials: "include" }
            );
            if (r2.ok) {
              const data2 = await r2.json();

              let cached: any = null;
              try {
                cached = JSON.parse(
                  sessionStorage.getItem("lastOrder") || "null"
                );
              } catch {}

              const merged: Order = {
                ...(data2 || {}),
                coupon:
                  data2?.coupon ??
                  data2?.couponCode ??
                  cached?.coupon ??
                  null,
                discount:
                  typeof data2?.discount === "number"
                    ? data2.discount
                    : typeof cached?.discount === "number"
                    ? cached.discount
                    : 0,
                shippingCost:
                  typeof data2?.shippingCost === "number"
                    ? data2.shippingCost
                    : typeof cached?.shippingCost === "number"
                    ? cached.shippingCost
                    : 0,
              };

              setOrder(merged);
              try {
                sessionStorage.setItem("lastOrder", JSON.stringify(merged));
              } catch {}
              setLoading(false);
              return;
            }
          }
        }

        // fallback: from state or cache
        const fromState: any = (location as any).state?.order;
        if (fromState) {
          setOrder(fromState);
          try {
            sessionStorage.setItem("lastOrder", JSON.stringify(fromState));
          } catch {}
          setLoading(false);
          return;
        }

        const cached = sessionStorage.getItem("lastOrder");
        if (cached) setOrder(JSON.parse(cached));
      } catch {
        // silent failure — the “thank you” layout can remain
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [location.search, location.state]);

  /* Disable browser "back" button */
  useEffect(() => {
    const preventBack = () => {
      navigate("/", { replace: true });
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, [navigate]);

  /* 4) Inventory reduction event once */
  useEffect(() => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;
    const key =
      `inv_event_sent:${order?._id || order?.orderId || order?.orderNumber || "unknown"}`;
    if (sessionStorage.getItem(key) === "1") return;

    try {
      const payload = order.items
        .map((it) => ({
          productId: String(it?.productId?._id || it?.productId || ""),
          quantity: Number(it?.quantity ?? it?.qty ?? 0),
          size: it?.size ?? null,
        }))
        .filter((x) => x.productId && x.quantity > 0);

      if (payload.length) {
        window.dispatchEvent(
          new CustomEvent("inventory:decreased", { detail: payload })
        );
        sessionStorage.setItem(key, "1");
      }
    } catch {}
  }, [order]);

  // Snapshot items
  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order]
  );

  // Subtotal: prefer lineTotal; then unitPrice*qty; finally legacy price*qty
  const subtotal = items.reduce((s, it) => {
    const qty = Number(it?.quantity ?? it?.qty ?? 1);
    const line = Number(it?.lineTotal ?? NaN);
    if (!Number.isNaN(line)) return s + line;
    const unit = Math.round(
      Number(it?.unitPrice ?? it?.price ?? it?.productId?.price ?? 0)
    );
    return s + unit * qty;
  }, 0);

  // Coupon/shipping – cache fallback + backup calculation with COUPON_RATE
  let cached: any = null;
  try {
    cached = JSON.parse(sessionStorage.getItem("lastOrder") || "null");
  } catch {}

  const COUPON_RATE = 0.1;
  const hasCoupon =
    (order?.coupon && String(order.coupon).trim() !== "") ||
    (order?.couponCode && String(order.couponCode).trim() !== "") ||
    (cached?.coupon && String(cached.coupon).trim() !== "");

  const discount = Math.max(
    0,
    Math.round(
      Number(
        order?.discount ??
          cached?.discount ??
          (hasCoupon ? subtotal * COUPON_RATE : 0)
      )
    )
  );

  const rawShipping = Number(order?.shippingCost ?? cached?.shippingCost ?? 0);
  const shippingUSD =
    rawShipping >= 200 && (rates?.HUF || 0)
    ? rawShipping / (rates.HUF || 370)
    : rawShipping;
  const total = Math.max(0, subtotal - discount + shippingUSD);

  const displayOrderNo = order?.orderNumber || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container max-w-4xl py-12 md:py-16">
        <Card className="glass-card border-primary/10 shadow-2xl overflow-hidden">
          {/* Hero / head */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full blur-xl opacity-30 animate-glow-pulse" />
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-4 animate-scale-in">
                  <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Thank you for your order!
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              We have sent you a confirmation via email.
            </p>
            {order?.customer?.email && (
              <p className="text-sm text-muted-foreground">
                Address:{" "}
                <span className="font-semibold text-foreground">
                  {order.customer.email}
                </span>
              </p>
            )}

            {displayOrderNo && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Order number:{" "}
                  <span className="font-bold text-primary">{displayOrderNo}</span>
                </span>
              </div>
            )}
          </div>

          {/* Summary */}
          {!loading && items.length > 0 && (
            <CardContent className="p-6 md:p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Order summary
                  </h2>

                  <div className="space-y-3">
                    {items.map((it, i) => {
                      const p =
                        (it?.productId && typeof it.productId === "object"
                          ? it.productId
                          : it) || {};
                      const name = p?.name || it?.name || "Product";
                      const qty = Number(it?.quantity ?? it?.qty ?? 1);

                      const unit = Math.round(
                        Number(it?.unitPrice ?? it?.price ?? p?.price ?? 0)
                      );
                      const orig = Math.round(
                        Number(
                          it?.originalPrice ?? p?.price ?? it?.price ?? unit
                        )
                      );
                      const lineSum = Math.round(
                        Number(it?.lineTotal ?? unit * qty)
                      );

                      const src = resolveImg(p);

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <img
                            src={src}
                            alt={name}
                            className="w-16 h-16 object-cover rounded-lg bg-background"
                            onError={(e) => {
                              const list = candidatesFor(p, 1);
                              const current = (e.currentTarget as HTMLImageElement).src;
                              const next = list.find((u) => u !== current);
                              (e.currentTarget as HTMLImageElement).src =
                                next || "/placeholder.svg";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base truncate">
                              {name}
                            </h3>
                            {it?.size && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Size:{" "}
                                <span className="font-medium">{it.size}</span>
                              </p>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {orig > unit ? (
                                <>
                                  <span className="line-through opacity-60 mr-2">{format(orig)}</span>
                                  <span className="text-foreground font-medium">{format(unit)}</span>
                                </>
                              ) : (
                                <span className="font-medium">{format(unit)}</span>
                              )}{" "}
                              × {qty}
                            </div>
                          </div>
                          <div className="font-semibold text-right">
                            {format(lineSum)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{format(subtotal)}</span>
                  </div>

                  {(discount > 0 || hasCoupon) && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span className="font-medium">-{format(discount)}</span>
                    </div>
                  )}

                  {typeof order?.shippingMethod === "string" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-medium">
                        {order?.shippingCost != null
                          ? format(shippingUSD)
                          : "Depends on the mode chosen"}
                      </span>
                    </div>
                  )}

                  <Separator className="my-3" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>In total</span>
                    <span className="text-primary">{format(total)}</span>
                  </div>
                </div>

                <Separator />

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      Back to the Homepage
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/orders">
                      <Package className="mr-2 h-4 w-4" />
                      My orders
                    </Link>
                  </Button>
                </div>

                <div className="text-center">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/contact">
                      <Mail className="mr-2 h-4 w-4" />
                      Help
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
