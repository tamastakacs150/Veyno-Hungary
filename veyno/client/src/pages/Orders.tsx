//client/src/pages/Orders.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Calendar, CreditCard, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import api from "../utils/api.js";
import resolveImg, { candidatesFor } from "../utils/resolveImg.js";
import "../styles/Cart.css";
import "../styles/Orders.css";

interface OrderItem {
  productId?: { name?: string; price?: number; [k: string]: any };
  name?: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  originalPrice?: number;
  lineTotal?: number;
  size?: string;
  [k: string]: any;
}

interface Order {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  items?: OrderItem[];
  totalAmount?: number;
  shippingCost?: number;
  discount?: number;
  coupon?: string;
  couponCode?: string;
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { format, rates } = useCurrency();

  /* === GET: /me/orders, 401 -> login === */
  useEffect(() => {
    setLoading(true);
    api
      .get("/me/orders")
      .then(({ data }: any) => setOrders(Array.isArray(data) ? data : []))
      .catch((e: any) => {
        const msg = e?.response?.data?.error || "Error loading orders.";
        setError(msg);
        if (e?.response?.status === 401) navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const normalizeUSD = (raw: number) => {
    const v = Number(raw || 0);
    if (v >= 200 && (rates?.HUF || 0)) return v / (rates.HUF || 370);
    return v;
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      delivered: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };
    return status ? (colors[status] || "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      delivered: "Delivered",
      pending: "Pending",
      cancelled: "Cancelled",
      processing: "Processing",
    };
    return status ? (labels[status] || status) : "-";
  };

  return (
    <div className="cart-page min-h-screen bg-background relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              My orders
            </h1>
            <p className="text-muted-foreground">Review your previous purchases</p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>

        {loading && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Loading...</div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardContent className="p-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && orders.length === 0 && (
          <Card className="bg-gradient-to-br from-card/80 via-card/70 to-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardContent className="p-12 text-center space-y-4">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <p className="text-lg text-muted-foreground">You don't have an order yet.</p>
              <Button asChild>
                <Link to="/">Start shopping</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((o) => {
              const id = o?._id || "";
              const orderNum = o?.orderNumber || id.slice(-8);
              const items = Array.isArray(o?.items) ? o.items : [];
              const subtotal = items.reduce((sum, it) => {
                const qty = Number(it?.quantity ?? 1);
                const line = Number(it?.lineTotal ?? NaN);
                if (!Number.isNaN(line)) return sum + line;
                const unitRaw = Number(it?.unitPrice ?? it?.price ?? it?.productId?.price ?? 0);
                return sum + normalizeUSD(unitRaw) * qty;
              }, 0);
              const shipping = normalizeUSD(Number(o?.shippingCost ?? 0));
              const discount = Math.max(0, normalizeUSD(Number(o?.discount ?? 0)));
              const total = Math.max(0, subtotal - discount + shipping);

              const coupon = o?.coupon || o?.couponCode || null;
              const hasCoupon = !!(coupon && String(coupon).trim());

              return (
                <Card
                  key={id}
                  className="bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border/50">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Order number</div>
                        <div className="font-bold text-lg">#{orderNum}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Date
                        </div>
                        <div className="font-semibold">
                          {o?.createdAt ? new Date(o.createdAt).toLocaleDateString("hu-HU") : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge className={getStatusColor(o?.status)}>{getStatusLabel(o?.status)}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1 flex items-center justify-end gap-1">
                          <CreditCard className="w-3 h-3" />
                          Total
                        </div>
                        <div className="font-bold text-2xl">{format(total)}</div>
                      </div>
                    </div>

                    {(hasCoupon || discount > 0) && (
                      <div className="flex items-center gap-2 text-sm bg-primary/5 px-4 py-2 rounded-lg border border-primary/20">
                        <Tag className="w-4 h-4 text-primary" />
                        <span>Coupon applied: </span>
                        <span className="font-bold">
                          {hasCoupon ? String(coupon).toUpperCase() : "DISCOUNT"}
                        </span>
                        <span className="ml-auto text-primary font-bold">-{format(discount)}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {items.map((it, i) => {
                        const p = (it && typeof it.productId === "object" && it.productId) || it || {};
                        const name = p?.name || it?.name || "Product";
                        const qty = Number(it?.quantity ?? 1);
                        const unit = Number(it?.unitPrice ?? it?.price ?? p?.price ?? 0);
                        const orig = normalizeUSD(Number(it?.originalPrice ?? p?.price ?? it?.price ?? unit));
                        const lineTotal = normalizeUSD(Number(it?.lineTotal ?? (unit * qty)));

                        return (
                          <div
                            key={i}
                            className="grid grid-cols-[64px_1fr_auto] gap-4 items-center p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <div className="aspect-square rounded-lg bg-background/50 overflow-hidden">
                              <img
                                src={resolveImg(p, 1)}
                                alt={name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const list = candidatesFor(p, 1);
                                  const current = (e.currentTarget as HTMLImageElement).src;
                                  const next = list.find((u) => u !== current);
                                  (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                                }}
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="font-semibold">{name}</div>
                              {it?.size && (
                                <div className="text-sm text-muted-foreground">
                                  Size: <span className="font-semibold">{it.size}</span>
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                {orig > unit ? (
                                  <>
                                    <span className="line-through opacity-60 mr-2">{format(orig)}</span>
                                    <span className="text-primary font-semibold">{format(unit)}</span>
                                  </>
                                ) : (
                                  <span>{format(unit)}</span>
                                )}{" "}
                                × {qty}
                              </div>
                            </div>
                            <div className="text-right font-bold text-lg">{format(lineTotal)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
