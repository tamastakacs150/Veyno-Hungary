//client/src/pages/ResetPassword.tsx
import type React from "react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../utils/api.js";
import { useAuth } from "@/auth/AuthContext";
import type { ApiError } from "@/types/models";

export default function ResetPassword() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const token = new URLSearchParams(useLocation().search).get("token");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!token) return setErr("Missing or invalid token.");
    if (password.length < 6) return setErr("The password must be at least 6 characters long.");
    if (password !== password2) return setErr("The passwords do not match.");

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setOk("Password updated successfully!");
      if (data?.token && data?.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.token, data.user);
      }
      setTimeout(() => nav("/login"), 1500);
    } catch (eRaw) {
        const e = eRaw as ApiError;
      setErr(e.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Reset password</h1>
        <p style={S.subtitle}>Enter your new password below.</p>

        {err && <div style={S.alert}>{err}</div>}
        {ok && (
          <div
            style={{
              ...S.alert,
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              color: "#389e0d",
            }}
          >
            {ok}
          </div>
        )}

        <form onSubmit={submit} style={S.form}>
          <label style={S.label}>
            <span>New password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={S.input}
              placeholder="Min. 6 characters"
            />
          </label>

          <label style={S.label}>
            <span>Confirm new password</span>
            <input
              type="password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={S.input}
              placeholder="Repeat the password"
            />
          </label>

          <button disabled={loading} type="submit" style={S.submit}>
            {loading ? "Saving..." : "Save new password"}
          </button>

          <div style={S.bottomRow}>
            <Link to="/login">Back to login</Link>
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
    padding: "24px 16px",
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
  title: { textAlign: "center", margin: "6px 0 12px", fontSize: 34, lineHeight: 1.15 },
  subtitle: { textAlign: "center", margin: "0 0 18px", opacity: 0.8 },
  form: { display: "grid", gap: 14 },
  label: { display: "grid", gap: 6, fontWeight: 600 },
  input: {
    width: "100%",
    height: 44,
    padding: "10px 12px",
    border: "1px solid #d9d9d9",
    borderRadius: 10,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  },
  submit: {
    padding: "12px 14px",
    borderRadius: 10,
    background: "#000",
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
    gap: 12,
    marginTop: 8,
    fontSize: 14,
  },
};
