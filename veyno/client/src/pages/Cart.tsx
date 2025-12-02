//client/src/pages/Cart.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/utils/api";
import { useCart } from "@/context/CartContext";
import resolveImg, { candidatesFor } from "@/utils/resolveImg";
import { useAuth } from "@/auth/AuthContext";
import "../styles/Cart.css";
import { useCurrency } from "@/context/CurrencyContext";

type CartItem = {
  _id?: string;
  id?: string;
  productId?: string;
  sku?: string;
  name: string;
  price?: number;
  effectivePrice?: number;
  originalPrice?: number;
  quantity: number;
  size?: string | null;
  category?: string | null;
  image?: string | null;
};

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQty, removeFromCart, totalPrice } = useCart();
  const { user } = useAuth();
  const [prodMap, setProdMap] = useState<Map<string, any>>(new Map());
  const [recommended, setRecommended] = useState<CartItem[]>([]);
  const [isLogged, setIsLogged] = useState<boolean | null>(null);
  const { format, convert } = useCurrency();

  const FREE_SHIPPING_THRESHOLD = 100;
  const fmt = (usd: number) => format(usd);
  const progressPercent = useMemo(
    () => Math.min(100, (Number(totalPrice || 0) / FREE_SHIPPING_THRESHOLD) * 100),
    [totalPrice]
  );

  // Recommended products: prefer categories in cart, exclude IDs in cart
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/products`);
        if (!alive) return;
        const all: any[] = Array.isArray(r.data) ? r.data : [];
        setProdMap(new Map(all.map((p) => [String(p._id || p.id), p])));

        const cartIds = new Set(
          (cart || []).map((it: CartItem) => String(it.productId || it._id || it.id || it.sku || ""))
        );
        const cartCats = new Set((cart || []).map((it: CartItem) => String(it.category || "").trim()));

        const notInCart = all.filter((p) => !cartIds.has(String(p._id || p.id || p.sku || "")));
        const sameCat = notInCart.filter((p) => cartCats.has(String(p.category || "")));
        const others = notInCart.filter((p) => !cartCats.has(String(p.category || "")));

        const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
        let picks: any[] = shuffle(sameCat).slice(0, 4);
        if (picks.length < 4) picks = [...picks, ...shuffle(others).slice(0, 4 - picks.length)];
        setRecommended(picks);
      } catch (e) {
        console.warn("Recommended products error:", e);
        if (!alive) return;
        setRecommended([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cart]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get("/auth/me");
        if (alive) setIsLogged(true);
      } catch {
        if (alive) setIsLogged(false);
      }
    })();
    return () => { alive = false; };
 }, []);

  const goLoginFromCart = () => { 
    if (isLogged === null) return;
    if (isLogged) {
      navigate("/checkout", { state: { from: "cart", cart } });
    } else {
      navigate("/loginfromcart", { state: { cart } });
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Cart
          </h1>

          {Number(totalPrice || 0) > 0 && Number(totalPrice || 0) < FREE_SHIPPING_THRESHOLD && (
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {fmt(FREE_SHIPPING_THRESHOLD - Number(totalPrice || 0))} more for free shipping
                    </span>
                    <span className="font-semibold text-foreground">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!cart || cart.length === 0 ? (
          <>
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardContent className="p-12 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground mb-6">Start shopping and add products!</p>
                <Button asChild size="lg">
                  <Link to="/">Start shopping</Link>
                </Button>
              </CardContent>
            </Card>

            {recommended.length > 0 && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold mb-8">Recommended products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {recommended.map((p: any) => {
                    const now = Number(p?.effectivePrice ?? p?.price ?? 0);
                    const orig = Number(p?.price ?? now);
                    return (
                      <Link key={p._id} to={`/product/${encodeURIComponent(p._id)}`} className="group">
                        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          <CardContent className="p-4">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                              <img
                                src={resolveImg(p)}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const list = candidatesFor(p, 1);
                                  const current = (e.currentTarget as HTMLImageElement).src;
                                  const next = list.find((u) => u !== current);
                                  (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                                }}
                              />
                            </div>
                            <h3 className="font-semibold mb-2 line-clamp-2">{p.name}</h3>
                            <p className="text-lg font-bold">
                              {orig > now ? (
                                <>
                                  <span className="text-sm line-through text-muted-foreground mr-2">
                                    {fmt(orig)}
                                  </span>
                                  <span className="text-black-600">{fmt(now)}</span>
                                </>
                              ) : (
                                fmt(now)
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {cart.map((item: CartItem) => {
                // 1) Separate identifiers – for product and line
                const prodKey = String(item.productId || (item as any).product?._id || item.sku || "");
                const lineKey = `${prodKey}__${item.size ?? ""}`;

                const pObj: any = prodMap.get(prodKey);
                const qty = Number(item.quantity ?? 1);
                const now = Number(pObj?.effectivePrice ?? pObj?.price ?? item.effectivePrice ?? item.price ?? 0);
                const orig = Number(pObj?.price ?? item.originalPrice ?? item.price ?? now);

                const src = resolveImg(item as any);

                return (
                  <Card
                    key={lineKey || Math.random().toString(36)}
                    className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                          <img
                            src={src}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const list = candidatesFor(item as any, 1);
                              const current = (e.currentTarget as HTMLImageElement).src;
                              const next = list.find((u) => u !== current);
                              (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2 truncate">{item.name}</h3>

                          {item.size && (
                            <p className="text-sm text-muted-foreground mb-3">
                              Size: <span className="font-medium text-foreground">{item.size}</span>
                            </p>
                          )}

                          <div className="mb-4">
                            {orig > now ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm line-through text-muted-foreground">{fmt(orig)}</span>
                                <span className="text-xl font-bold">{fmt(now)}</span>
                              </div>
                            ) : (
                              <span className="text-xl font-bold">{fmt(now)}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQty(lineKey, -1)}
                                disabled={qty <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-10 sm:w-12 text-center font-semibold">{qty}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQty(lineKey, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeFromCart(lineKey)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className="sm:flex-shrink-0 sm:text-right mt-3 sm:mt-0">
                          <p className="text-xl sm:text-2xl font-bold">{fmt(now * qty)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 shadow-xl">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-6 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
                    <p className="text-3xl sm:text-4xl font-bold break-words">{fmt(Number(totalPrice || 0))}</p>
                  </div>
                  <Button size="lg" onClick={goLoginFromCart} disabled={isLogged === null} className="w-full sm:w-auto group">
                    Proceed
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {recommended.length > 0 && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold mb-8">Recommended products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {recommended.map((p: any) => {
                    const now = Number(p?.effectivePrice ?? p?.price ?? 0);
                    const orig = Number(p?.price ?? now);

                    return(
                      <Link key={p._id} to={`/product/${encodeURIComponent(p._id)}`} className="group">
                        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          <CardContent className="p-4">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                              <img
                                src={resolveImg(p)}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const list = candidatesFor(p, 1);
                                  const current = (e.currentTarget as HTMLImageElement).src;
                                  const next = list.find((u) => u !== current);
                                  (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                                }}
                              />
                            </div>
                            <h3 className="font-semibold mb-2 line-clamp-2">{p.name}</h3>
                            <p className="text-lg font-bold">
                              {orig > now ? (
                                <>
                                  <span className="text-sm line-through text-muted-foreground mr-2">
                                    {fmt(orig)}
                                  </span>
                                  <span className="text-black-600">{fmt(now)}</span>
                                </>
                              ) : (
                                fmt(now)
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                  )})}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
