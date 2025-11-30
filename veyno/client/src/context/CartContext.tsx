//client/src/context/CartContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";

const API_URL = import.meta.env?.VITE_API_URL || "https://localhost:5555";
const LS_KEY = "cart";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

// ---- LocalStorage helpers ----
function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
}
function writeLocal(items, writer /* 'guest' | 'auth' */) {
    localStorage.setItem(LS_KEY, JSON.stringify(items || []));
    if (writer) localStorage.setItem("cart_writer", writer);
}

// ---- Server sync helpers ----
async function pushServerCart(items, token) {
    if (!token) return;
    const payload = (items || []).map(it => ({
        productId: it.productId || it._id || it.id,
        quantity: it.quantity ?? it.qty ?? 1,
        size: it.size ?? null,
    }));
    await fetch(`${API_URL}/me/cart`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: payload }),
    }).catch(() => { });
}

async function addServerItem(productId, qty = 1, token, size = null) {
    if (!token) return;
    await fetch(`${API_URL}/me/cart/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: qty, size }),
    }).catch(() => { });
}

async function fetchServerCart(token) {
    if (!token) return null;
    try {
        const r = await fetch(`${API_URL}/me/cart`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        return (data.items || []).map(it => ({
            productId: it.productId?._id || it.productId || it.id,
            _id: it.productId?._id || it.productId || it.id,
            name: it.name,
            price: it.price,
            image: it.image,
            category: it.category,
            quantity: it.quantity ?? 1,
            size: it.size ?? null,
        }));
    } catch {
        return null;
    }
}

export function CartProvider({ children }) {
    const { token } = useAuth();
    const hasToken = !!token || !!localStorage.getItem("token");
    const [cart, setCart] = useState(() => (hasToken ? [] : readLocal()));

    // Any cart changes -> save to LS
    useEffect(() => {
        writeLocal(cart, token ? "auth" : "guest");
    }, [cart, token]);

    useEffect(() => {
        const onUpdated = () => {
            const fresh = readLocal();
            setCart(fresh);
        };
        window.addEventListener("cart-updated", onUpdated);
        return () => window.removeEventListener("cart-updated", onUpdated);
    }, []);

    // Logged in to the server as the source: pull it down after the first render
    useEffect(() => {
        (async () => {
            if (!token) return;

            const fromVerify = sessionStorage.getItem("arrivedFromVerify") === "1";
            const local = readLocal();

            if (fromVerify && local.length) {
            try { await pushServerCart(local, token); } catch {}
            setCart(local);          // the local cart remains
            writeLocal(local, "auth");
            sessionStorage.removeItem("arrivedFromVerify");
            return;
            }

            const server = await fetchServerCart(token);
            if (server && server.length) {
            setCart(server);
            writeLocal(server, "auth");
            } else if (local.length) {
            setCart(local);
            writeLocal(local, "auth");
            try { await pushServerCart(local, token); } catch {}
            } else {
            setCart([]);
            writeLocal([], "auth");
            }
        })();
        }, [token]);

    // ---- Operations ----
    const addToCart = async (product, qty = 1) => {
        const id = product._id;
        const size = product.size ?? product.selectedSize ?? null;
        let next = [];

        setCart(prev => {
            const idx = prev.findIndex(i => {
                const pid = (i.productId ?? i._id);
                return pid === id && String(i.size ?? "") === String(size ?? "");
            });
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

        await addServerItem(id, qty, token, size);
    };

    const removeFromCart = async (lineKey) => {
        let next = [];
        setCart(prev => {
            next = prev.filter(i => {
                const pid = i.productId ?? i._id;
                const key = `${pid}__${i.size ?? ""}`;
                return key !== lineKey;
            });
            return next;
        });
        await pushServerCart(next, token);
    };

    const updateQty = async (lineKey, delta) => {
        let next = [];
        setCart(prev => {
            next = prev.map(i => {
                const pid = i.productId ?? i._id;
                const key = `${pid}__${i.size ?? ""}`;
                if (key !== lineKey) return i;
                return { ...i, quantity: Math.max(1, (i.quantity ?? 1) + delta) };
            });
            return next;
        });
        await pushServerCart(next, token);
    };

    const clearCart = async () => {
        setCart([]);
        writeLocal([], token ? "auth" : "guest");
        if (token) {
            await fetch(`${API_URL}/me/cart/clear`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => { });
        }
    };

    const totalCount = useMemo(
        () => cart.reduce((s, i) => s + (i.quantity || 0), 0),
        [cart]
    );
    const totalPrice = useMemo(
        () => cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0),
        [cart]
    );

    return (
        <CartContext.Provider
            value={{ cart, addToCart, removeFromCart, updateQty, clearCart, totalCount, totalPrice }}
        >
            {children}
        </CartContext.Provider>
    );
}
