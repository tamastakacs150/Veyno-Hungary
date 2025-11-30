// client/src/auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import { wishlistStore } from "../stores/wishlistStore.js";
import { useToast } from "@/hooks/use-toast";

/* ===== LocalStorage helpers ===== */
function getGuestCart() {
    try {
        return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
        return [];
    }
}
function setGuestCart(items) {
    localStorage.setItem("cart", JSON.stringify(items || []));
    localStorage.setItem("cart_writer", "guest");
    window.dispatchEvent(new Event("cart-updated"));
}
function setAuthCart(items) {
    localStorage.setItem("cart", JSON.stringify(items || []));
    localStorage.setItem("cart_writer", "auth");
    window.dispatchEvent(new Event("cart-updated"));
}

/* ===== Server sync ===== */
async function mergeGuestCartToServer() {
    const writer = localStorage.getItem("cart_writer");
    const guest = getGuestCart();
    if (writer !== "guest" || !guest?.length) return;

    const payload = guest.map((it) => ({
        productId: it.productId || it._id || it.id,
        quantity: it.quantity ?? it.qty ?? 1,
        size: it.size ?? it.selectedSize ?? null,
    }));

    await api.post("/me/cart/merge", { items: payload }).catch(() => { });
}

async function pullServerCartToLocal() {
    try {
        const { data } = await api.get("/me/cart");
        const normalized = (data.items || []).map((it) => ({
            productId: it.productId?._id || it.productId || it.id,
            quantity: it.quantity ?? it.qty ?? 1,
            name: it.name,
            price: it.price,
            image: it.image,
            category: it.category,
            size: it.size ?? null,
        }));
        setAuthCart(normalized);
    } catch { }
}

/* ===== Auth Context ===== */
const defaultAuth = {
    user: null,
    token: null,
    login: async () => { },
    register: async () => { },
    logout: () => { },
    updateUser: () => { },
    loginWithGoogle: async () => { },
    loginWithToken: async () => { },
};

const AuthCtx = createContext(defaultAuth);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const navigate = useNavigate();
    const { toast } = useToast();

    /* ===== Global API set ===== */
    api.defaults.withCredentials = true;
    useEffect(() => {
        if (token)
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
        else
            delete api.defaults.headers.common.Authorization;
    }, [token]);

    // INSIDE the AuthProvider component:
    useEffect(() => {
        function onStorage(e) {
            if (e.key === "token") {
                const t = e.newValue || null;
                setToken(t);
                if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
                else delete api.defaults.headers.common.Authorization;
            }
            if (e.key === "user") {
                try {
                    const u = e.newValue ? JSON.parse(e.newValue) : null;
                    setUser(u);
                } catch {
                    setUser(null);
                }
            }
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    /* ===== User update (Header responds) ===== */
    const updateUser = (patch) => {
        setUser((prev) => {
            const next = { ...(prev || {}), ...(patch || {}) };
            localStorage.setItem("user", JSON.stringify(next));
            return next;
        });
    };

    /* ===== Google login ===== */
    const loginWithGoogle = async (credential) => {
        const { data } = await api.post("/auth/google", { credential });
        if (!data?.token)
            throw new Error("Missing token in login response.");

        setToken(data.token);
        localStorage.setItem("token", data.token);

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));

        await wishlistStore.enableOnlineAndMerge();
        api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        toast({
            title: "Login Successful",
            description: "Welcome back!",
            variant: "success"
        });

        // Admin redirect
        const role = data?.user?.role ?? JSON.parse(localStorage.getItem("user") || "{}")?.role;
        navigate(role === "admin" ? "/admin" : "/", { replace: true });

        return data;
    };

    /* ===== Normal login ===== */
    const login = async (email, password) => {



        const { data } = await api.post("/auth/login", { email, password });
        if (!data?.token)
            throw new Error("Missing token in Google login response.");

        setToken(data.token);
        localStorage.setItem("token", data.token);

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));

        await mergeGuestCartToServer();
        await pullServerCartToLocal();
        await wishlistStore.enableOnlineAndMerge();

        // extra check back from the backend
        try {
            const me = await api.get("/auth/me");
            if (me?.data) {
                setUser(me.data);
                localStorage.setItem("user", JSON.stringify(me.data));
            }
        } catch { }

        toast({
            title: "Login Successful",
            description: "Welcome back!",
            variant: "success"
        });

        // Admin redirect
        const role =
            JSON.parse(localStorage.getItem("user") || "{}")?.role ||
            data?.user?.role;
        navigate(role === "admin" ? "/admin" : "/", { replace: true });

        return data;
    };

    /* ===== Registration ===== */
    const register = async (name, email, password) => {
        const { data } = await api.post("/auth/register", { name, email, password });
        await mergeGuestCartToServer();
        await pullServerCartToLocal();
        return data;
    };

    /* ===== Logout ===== */
    const logout = async () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common.Authorization;
        await api.post("/auth/logout").catch(() => { });
        wishlistStore.disableOnlineKeepLocal();
        setGuestCart([]);
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
            variant: "destructive"
        });
    };

    /* ===== User reload on page load ===== */
    useEffect(() => {
        const hydrate = async () => {
            try {
                if (token && !user) {
                    const { data } = await api.get("/auth/me");
                    if (data) {
                        setUser(data);
                        localStorage.setItem("user", JSON.stringify(data));
                        await mergeGuestCartToServer();
                        await pullServerCartToLocal();
                        await wishlistStore.enableOnlineAndMerge();
                    }
                }
            } catch (e) {
                console.warn("AuthContext hydrate error:", e.message);
                setUser(null);
                setToken(null);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                delete api.defaults.headers.common.Authorization;
            }
        };
        hydrate();
    }, [token]);

    // --- COMMON helper: set auth state from token (INSIDE COMPONENT!) ---
    const applyAuthFromToken = async (userObj, tokenStr) => {
        setToken(tokenStr);
        localStorage.setItem("token", tokenStr);

        setUser(userObj);
        localStorage.setItem("user", JSON.stringify(userObj));

        api.defaults.headers.common.Authorization = `Bearer ${tokenStr}`;

        await mergeGuestCartToServer();
        await pullServerCartToLocal();
        await wishlistStore.enableOnlineAndMerge();

        // optional checkback – itt sem kell külön header, mert api.defaults már be van állítva
        try {
            const me = await api.get("/auth/me");
            if (me?.data) {
                setUser(me.data);
                localStorage.setItem("user", JSON.stringify(me.data));
            }
        } catch { }
    };

    const loginWithToken = async (userObj, tokenStr) => {
        if (!userObj || !tokenStr) throw new Error("Missing user/token for loginWithToken.");
        await applyAuthFromToken(userObj, tokenStr);
    };

    return (
        <AuthCtx.Provider
            value={{
                user,
                token,
                login,
                register,
                logout,
                updateUser,
                loginWithGoogle,
                loginWithToken,
            }}
        >
            {children}
        </AuthCtx.Provider>
    );
}
