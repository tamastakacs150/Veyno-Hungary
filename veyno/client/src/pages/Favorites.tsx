//client/src/pages/Favorites.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/context/CurrencyContext";
import api from "../utils/api.js";
import useWishlist from "../hooks/useWishlist";
import { useCart } from "@/context/CartContext";
import resolveImg, { candidatesFor } from "../utils/resolveImg.js";
import "../styles/Cart.css";
import "../styles/Favorites.css";

interface Product {
  _id: string;
  name: string;
  price: number;
  brand?: string;
  slug?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Favorites() {
  const { ids, has: isFav, toggle: toggleFav } = useWishlist();
  const { addToCart } = useCart();
  const { format } = useCurrency();
  const [all, setAll] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/products`)
      .then((res: any) => {
        if (!alive) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setAll(data as Product[]);
      })
      .catch((err: any) => console.error("Could not load favourites:", err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const favoriteProducts = useMemo(() => {
    const map = new Map(all.map((p) => [String(p._id), p]));
    return (ids as any[]).map((id) => map.get(String(id))).filter(Boolean) as Product[];
  }, [ids, all]);

  const recommended = useMemo(() => {
    const favSet = new Set((ids as any[]).map(String));
    const pool = all.filter((p) => !favSet.has(String(p._id)));
    return shuffle(pool).slice(0, 4);
  }, [all, ids]);

  const handleAdd = useCallback(
    (p: Product) => {
      addToCart(p as any, 1);
    },
    [addToCart]
  );

  const productLink = (p: Product) => (p?.slug ? `/product/${p.slug}` : `/product/${p._id}`);

  return (
    <div className="cart-page min-h-screen bg-background relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Favourites
          </h1>
        </div>

        {loading && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Loading…</div>
            </CardContent>
          </Card>
        )}

        {!loading && favoriteProducts.length === 0 && (
          <Card className="bg-gradient-to-br from-card/80 via-card/70 to-card/60 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardContent className="p-12 text-center space-y-4">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <p className="text-lg text-muted-foreground">
                There are no favorite products yet. Browse the homepage and add them to your favorites!
              </p>
              <Button asChild size="lg">
                <Link to="/">Browse</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && favoriteProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {favoriteProducts.map((p) => {
              const now = Number((p as any)?.effectivePrice ?? p.price ?? 0);
              const orig = Number(p.price ?? now);
            
              return (
                <Card
                  key={p._id}
                  className="group bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <Link to={productLink(p)} className="block">
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted cursor-pointer">
                        <img
                          src={resolveImg(p, 1)}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const list = candidatesFor(p, 1);
                            const current = (e.currentTarget as HTMLImageElement).src;
                            const next = list.find((u: string) => u !== current);
                            (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>

                    <div className="p-4 space-y-3">
                      <button
                        onClick={() => toggleFav((p as any)._id)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10"
                        aria-label="Toggle favorite"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${isFav((p as any)._id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                        />
                      </button>

                      <Link to={productLink(p)}>
                        <h3 className="font-bold text-lg leading-tight hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xl font-bold mt-2">
                          {orig > now ? (
                            <span className="inline-flex items-baseline gap-2">
                              <span className="text-sm line-through text-muted-foreground">
                                {format(orig)}
                              </span>
                              <span className="text-black-600 font-semibold">
                                {format(now)}
                              </span>
                            </span>
                          ) : (
                            format(now)
                          )}
                        </p>
                      </Link>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAdd(p);
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add to cart
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          color="#ff3030ff"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFav((p as any)._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
          </div>
        )}

        {!loading && recommended.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Recommended products</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.map((p) => {
                const now = Number((p as any)?.effectivePrice ?? p.price ?? 0);
                const orig = Number(p.price ?? now);
                return (
                  <Card
                    key={p._id}
                    className="group bg-gradient-to-br from-card/80 via-card/70 to-card/60 backdrop-blur-xl border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1 overflow-hidden"
                  >
                    <CardContent className="p-0">
                      <Link to={productLink(p)} className="block">
                        <div className="relative aspect-[3/4] overflow-hidden bg-muted cursor-pointer">
                          <img
                            src={resolveImg(p, 1)}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              const list = candidatesFor(p, 1);
                              const current = (e.currentTarget as HTMLImageElement).src;
                              const next = list.find((u: string) => u !== current);
                              (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-bold leading-tight group-hover:text-primary transition-colors">
                            {p.name}
                          </h3>
                          <p className="text-lg font-bold">
                            {orig > now ? (
                              <>
                                <span className="text-sm line-through text-muted-foreground mr-2">
                                  {format(orig)}
                                </span>
                                <span className="text-black-600">{format(now)}</span>
                              </>
                            ) : (
                              format(now)
                            )}
                          </p>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                )})}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
