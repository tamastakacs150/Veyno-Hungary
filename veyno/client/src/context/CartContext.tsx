import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import api from "@/utils/api"; // <--- 1. IMPORTÁLD BE AZ API-t (ellenõrizd az elérési utat!)

const LS_KEY = "cart";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
}
function writeLocal(items, writer) {
    localStorage.setItem(LS_KEY, JSON.stringify(items || []));
    if (writer) localStorage.setItem("cart_writer", writer);
}

// ---- Server sync helpers (AXIOS-ra átírva) ----

async function pushServerCart(items) {
    // Az api.js már küldi a sütiket (withCredentials: true), nem kell manuális token header!
    const payload = (items || []).map(it => ({
        productId: it.productId || it._id || it.id,
        quantity: it.quantity ?? it.qty ?? 1,
        size: it.size ?? null,
    }));

    // Az api.js baseURL-je intézi az /api-t, itt csak a végpont kell
    await api.put("/me/cart", { items: payload }).catch(() => { });
}

async function addServerItem(productId, qty = 1, size = null) {
    await api.post("/me/cart/add", { productId, quantity: qty, size }).catch(() => { });
}

async function fetchServerCart() {
    try {
        // Nincs szükség token argumentumra, a süti intézi
        const { data } = await api.get("/me/cart");

        // Adatfeldolgozás (mapping)
        return (data.items || []).map(it => {
            // A korábban javasolt robusztusabb mapping:
            const productObj = (typeof it.productId === 'object' && it.productId !== null)
                ? it.productId
                : null;

            return {
                productId: productObj?._id || it.productId || it.id,
                _id: productObj?._id || it.productId || it.id,
                name: productObj?.name || it.name || "Ismeretlen",
                price: productObj?.price || it.price || 0,
                image: productObj?.image || it.image,
                category: productObj?.category || it.category,
                quantity: it.quantity ?? 1,
                size: it.size ?? null,
            };
        });
    } catch (err) {
        console.error("Cart fetch error:", err);
        return null;
    }
}

export function CartProvider({ children }) {
    const { token, user } = useAuth(); // A user objektum is hasznos lehet, ha a token nem elég
    // A token vizsgálat helyett inkább a user meglétét nézzük, de maradhat a token is
    const isLoggedIn = !!token || !!user;

    const [cart, setCart] = useState(() => (isLoggedIn ? [] : readLocal()));

    useEffect(() => {
        writeLocal(cart, isLoggedIn ? "auth" : "guest");
    }, [cart, isLoggedIn]);

    useEffect(() => {
        const onUpdated = () => setCart(readLocal());
        window.addEventListener("cart-updated", onUpdated);
        return () => window.removeEventListener("cart-updated", onUpdated);
    }, []);

    // Szerver szinkronizáció
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

            // Itt már nem kell token-t átadni
            const server = await fetchServerCart();

            if (!mounted) return;

            if (server && server.length) {
                setCart(server);
                writeLocal(server, "auth");
            } else if (local.length) {
                // Ha a szerver üres, de van lokális, feltoljuk
                setCart(local);
                writeLocal(local, "auth");
                try { await pushServerCart(local); } catch { }
            } else {
                setCart([]);
                writeLocal([], "auth");
            }
        })();

        return () => { mounted = false; };
    }, [isLoggedIn]); // Token változás helyett isLoggedIn

    // ---- Operations ----
    const addToCart = async (product, qty = 1) => {
        const id = product._id;
        const size = product.size ?? product.selectedSize ?? null;

        setCart(prev => {
            // ... (a te eredeti logikád maradhat itt változatlan) ...
            const idx = prev.findIndex(i => {
                const pid = (i.productId ?? i._id);
                return pid === id && String(i.size ?? "") === String(size ?? "");
            });
            let next = [];
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

    const removeFromCart = async (lineKey) => {
        let nextCart = [];
        setCart(prev => {
            nextCart = prev.filter(i => {
                const pid = i.productId ?? i._id;
                const key = `${pid}__${i.size ?? ""}`;
                return key !== lineKey;
            });
            return nextCart;
        });

        // A pushServerCart itt egyszerûbb, mert a teljes állapotot küldi
        if (isLoggedIn) await pushServerCart(nextCart);
    };

    const updateQty = async (lineKey, delta) => {
        let nextCart = [];
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