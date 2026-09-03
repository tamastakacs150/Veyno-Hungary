import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "@/auth/AuthContext";
import api from "@/utils/api";
import type { CartItem, Product } from "@/types/models";

const LS_KEY = "cart";

export interface CartContextValue {
    cart: CartItem[];
    addToCart: (product: AddToCartInput, qty?: number) => Promise<void>;
    removeFromCart: (lineKey: string) => Promise<void>;
    updateQty: (lineKey: string, delta: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalCount: number;
    totalPrice: number;
}

/** A product plus the size chosen on the product page. */
export type AddToCartInput = Product & {
    size?: string | null;
    selectedSize?: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);

export const useCart = (): CartContextValue => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used inside a CartProvider");
    return ctx;
};

function readLocal(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as CartItem[]; }
    catch { return []; }
}
function writeLocal(items: CartItem[], writer?: string) {
    localStorage.setItem(LS_KEY, JSON.stringify(items || []));
    if (writer) localStorage.setItem("cart_writer", writer);
}

// ---- Server sync helpers (axios) ----

async function pushServerCart(items: CartItem[]) {
    // api.js already sends the cookies (withCredentials: true), no manual token header needed
    const payload = (items || []).map(it => ({
        productId: it.productId || it._id || it.id,
        quantity: it.quantity ?? it.qty ?? 1,
        size: it.size ?? null,
    }));

    // api.js baseURL handles the /api prefix, only the endpoint is needed here
    await api.put("/me/cart", { items: payload }).catch(() => { });
}

async function addServerItem(productId: string, qty = 1, size: string | null = null) {
    await api.post("/me/cart/add", { productId, quantity: qty, size }).catch(() => { });
}

async function fetchServerCart(): Promise<CartItem[] | null> {
    try {
        // No token argument needed, the cookie handles it
        const { data } = await api.get("/me/cart");

        return (data.items || []).map((it: CartItem) => {
            const productObj = (typeof it.productId === "object" && it.productId !== null)
                ? it.productId as Product
                : null;

            return {
                productId: productObj?._id || it.productId || it.id,
                _id: productObj?._id || (it.productId as string) || it.id,
                name: productObj?.name || it.name || "Ismeretlen",
                price: productObj?.price || it.price || 0,
                image: productObj?.image || it.image,
                category: productObj?.category || it.category,
                quantity: it.quantity ?? 1,
                size: it.size ?? null,
            } as CartItem;
        });
    } catch (err) {
        console.error("Cart fetch error:", err);
        return null;
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth(); // the user object is useful too, if the token is not enough
    // instead of checking the token we look at whether there is a user, but the token can stay
    const isLoggedIn = !!token || !!user;

    const [cart, setCart] = useState<CartItem[]>(() => (isLoggedIn ? [] : readLocal()));

    useEffect(() => {
        writeLocal(cart, isLoggedIn ? "auth" : "guest");
    }, [cart, isLoggedIn]);

    useEffect(() => {
        const onUpdated = () => setCart(readLocal());
        window.addEventListener("cart-updated", onUpdated);
        return () => window.removeEventListener("cart-updated", onUpdated);
    }, []);

    // Server synchronisation
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!isLoggedIn) return;

            const fromVerify = sessionStorage.getItem("arrivedFromVerify") === "1";
            const local = readLocal();

            if (fromVerify && local.length) {
                try { await pushServerCart(local); } catch { }
                if (mounted) setCart(local);
                writeLocal(local, "auth");
                sessionStorage.removeItem("arrivedFromVerify");
                return;
            }

            // no token needs to be passed here any more
            const server = await fetchServerCart();

            if (!mounted) return;

            if (server && server.length) {
                setCart(server);
                writeLocal(server, "auth");
            } else if (local.length) {
                // server cart is empty but there is a local one, push it up
                setCart(local);
                writeLocal(local, "auth");
                try { await pushServerCart(local); } catch { }
            } else {
                setCart([]);
                writeLocal([], "auth");
            }
        })();

        return () => { mounted = false; };
    }, [isLoggedIn]); // isLoggedIn instead of token changes

    // ---- Operations ----
    const addToCart = async (product: AddToCartInput, qty = 1) => {
        const id = product._id;
        const size = product.size ?? product.selectedSize ?? null;

        setCart(prev => {
            const idx = prev.findIndex(i => {
                const pid = (i.productId ?? i._id);
                return pid === id && String(i.size ?? "") === String(size ?? "");
            });
            let next: CartItem[] = [];
            if (idx >= 0) {
                next = prev.map(i =>
                    ((i.productId ?? i._id) === id && String(i.size ?? "") === String(size ?? ""))
                        ? { ...i, quantity: (i.quantity ?? 1) + qty }
                        : i
                );
            } else {
                next = [...prev, {
                    productId: id,
                    _id: id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    category: product.category,
                    quantity: qty,
                    size,
                }];
            }
            return next;
        });

        if (isLoggedIn) {
            await addServerItem(id, qty, size);
        }
    };

    const removeFromCart = async (lineKey: string) => {
        let nextCart: CartItem[] = [];
        setCart(prev => {
            nextCart = prev.filter(i => {
                const pid = i.productId ?? i._id;
                const key = `${pid}__${i.size ?? ""}`;
                return key !== lineKey;
            });
            return nextCart;
        });

        // pushServerCart is simpler here because it sends the whole state
        if (isLoggedIn) await pushServerCart(nextCart);
    };

    const updateQty = async (lineKey: string, delta: number) => {
        let nextCart: CartItem[] = [];
        setCart(prev => {
            nextCart = prev.map(i => {
                const pid = i.productId ?? i._id;
                const key = `${pid}__${i.size ?? ""}`;
                if (key !== lineKey) return i;
                return { ...i, quantity: Math.max(1, (i.quantity ?? 1) + delta) };
            });
            return nextCart;
        });
        if (isLoggedIn) await pushServerCart(nextCart);
    };

    const clearCart = async () => {
        setCart([]);
        writeLocal([], isLoggedIn ? "auth" : "guest");
        if (isLoggedIn) {
            await api.post("/me/cart/clear").catch(() => { });
        }
    };

    const totalCount = useMemo(() => cart.reduce((s, i) => s + (i.quantity || 0), 0), [cart]);
    const totalPrice = useMemo(() => cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0), [cart]);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, totalCount, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
}
