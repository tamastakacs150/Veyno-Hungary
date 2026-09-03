//client/src/pages/ForgotPassword.tsx
import type React from "react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api.js";
import type { ApiError } from "@/types/models";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setMsg("If the address exists, we have sent an email to reset your password.");
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
        <h1 style={S.title}>Forgot password</h1>
        <p style={S.subtitle}>Enter your email address and we'll send you a reset link.</p>

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

        <form onSubmit={submit} style={S.form}>
          <label style={S.label}>
            <span>E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={S.input}
              placeholder="mail@example.com"
            />
          </label>

          <button disabled={loading} type="submit" style={S.submit}>
            {loading ? "Sending..." : "Send a link"}
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
  title: { textAlign: "center", margin: "6px 0 12px", fontSize: 34, lineHeight: 1.15 },
  subtitle: { textAlign: "center", margin: "0 0 18px", opacity: 0.8 },
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
