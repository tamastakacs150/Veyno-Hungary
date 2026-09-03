//client/src/pages/Login.tsx
import type React from "react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/auth/AuthContext";
import { Icon } from "../icons/icons";
import type { ApiError } from "@/types/models";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await login(email, password);
      setMsg("Login successful.");
      setTimeout(() => nav("/"), 1500);
    } catch (eRaw) {
        const e = eRaw as ApiError;
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
              onSuccess={(resp) => {
                setErr("");
                setMsg("");
                return loginWithGoogle(resp.credential)
                  .then(() => {
                    setMsg("Successful login with Google account.");
                    setTimeout(() => nav("/"), 1500);
                  })
                  .catch((e) =>
                    setErr(e?.response?.data?.error || e?.message || "Google login failed.")
                  );
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

          <div style={S.bottomRow}>
            <span>Don't have an account?</span> <Link to="/register" style={{ textDecoration: "underline", opacity: 0.95 }}>Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
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
