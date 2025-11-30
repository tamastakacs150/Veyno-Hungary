//client/src/pages/LoginFromCart.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/auth/AuthContext";
import { Icon } from "../icons/icons";
import { Button } from "@/components/ui/button";
import api from "../utils/api.js";

export default function Login() {
  const { login, loginWithGoogle, user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const cartFromState = location.state?.cart || null;
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function mergeGuestCartThenGo(cartFromState: any, nav: any) {
    try {
      const guest = Array.isArray(cartFromState) && cartFromState.length
        ? cartFromState
        : JSON.parse(localStorage.getItem("cart") || "[]");

      const token = localStorage.getItem("token");

      if (Array.isArray(guest) && guest.length && token) {
        const normalized = guest.map(it => ({
          productId: it.productId || it.id || it._id,
          quantity: it.quantity || 1,
          size: it.size || it.selectedSize || it.variant?.size || null,
        }));

        await api.post(
          "/api/me/cart/merge",
          { items: normalized },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sessionStorage.setItem("mergedAtLogin", "1");
      }
    } catch (err) {
      console.error("Merge error:", err);
    }

    nav("/checkout", { replace: true, state: { from: "cart-guest" } });
  }
  
  useEffect(() => {
    if (user) {
      mergeGuestCartThenGo(cartFromState, nav);
    }
  }, [user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await login(email, password);
      setMsg("Login successful.");
      await mergeGuestCartThenGo(cartFromState, nav);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Error while logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Login</h1>

        {err && <div style={S.alert}>{err}</div>}
        {msg && (
          <div
            style={{
              ...S.alert,
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              color: "#389e0d",
            }}
          >
            {msg}
          </div>
        )}

        <div className="g-btn-wrap">
          <div className="g-btn-inner">
            <GoogleLogin
              onSuccess={async (resp) => {
                setErr("");
                setMsg("");
                try {
                  await loginWithGoogle(resp.credential);
                  setMsg("Successful login with Google account.");
                  await mergeGuestCartThenGo(cartFromState, nav);
                } catch (e) {
                  setErr(e?.response?.data?.error || e?.message || "Google login failed.");
                }
              }}
              onError={() => setErr("Google login failed.")}
              useOneTap={false}
            />
          </div>
        </div>

        <form onSubmit={onSubmit} style={S.form}>
          <label style={S.label}>
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              placeholder="mail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={S.input}
            />
          </label>

          <label style={S.label}>
            <span>Password</span>
            <div style={S.pwdWrap}>
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPwd(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...S.input, paddingRight: 56 }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                style={S.eyeBtn}
                title={showPwd ? "Hide" : "Show"}
              >
                <Icon name={showPwd ? "eyeoff" : "eye"} size={18} strokeWidth={2} style={{ display: "block" }} />
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading} style={S.submit}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div style={S.bottomRow}>
            <Link
              to="/forgot-password"
              style={{ textDecoration: "underline", opacity: 0.95 }}
            >
              Forgot password
            </Link>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <Button
            type="button"
            onClick={() => nav("/checkout", { replace: false, state: { from: "cart-guest", cart: cartFromState } })}
          >
              Continue as guest
            </Button>
          </div>

          <div style={S.bottomRow}>
            <span>Don't have an account?</span>{" "}
            <Link
              to="/registerfromcart"
              state={{ cart: cartFromState }}
              style={{ textDecoration: "underline", opacity: 0.95 }}
            >
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  page: {
    width: "100%",
    minHeight: "100%",
    display: "grid",
    placeContent: "center",
    padding: "24px 16px"
  },
  card: {
    width: "100%",
    maxWidth: "clamp(640px, 58vw, 760px)",
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 6px 20px rgba(0,0,0,.06)",
  },
  title: { textAlign: "center", margin: "6px 0 18px", fontSize: 34, lineHeight: 1.15 },
  form: { display: "grid", gap: 14 },
  label: { display: "grid", gap: 6, fontWeight: 600 },
  input: {
    width: "100%",
    maxWidth: "100%",
    display: "block",
    boxSizing: "border-box",
    height: 44,
    padding: "10px 12px",
    border: "1px solid #d9d9d9",
    borderRadius: 10,
    outline: "none",
    background: "#fff",
  },
  pwdWrap: {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    height: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 2,
    top: 2,
    bottom: 2,
    width: 40,
    display: "grid",
    placeItems: "center",
    lineHeight: 0,
    border: "1px solid #fff",
    background: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    boxSizing: "border-box",
  },
  submit: {
    padding: "12px 14px",
    borderRadius: 10,
    background: "#000000ff",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  alert: {
    background: "#fff1f0",
    border: "1px solid #ffccc7",
    color: "#a8071a",
    padding: "8px 12px",
    borderRadius: 10,
    marginBottom: 12,
  },
  bottomRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    fontSize: 14
  },
};
