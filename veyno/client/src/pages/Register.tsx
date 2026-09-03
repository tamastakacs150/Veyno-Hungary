//client/src/pages/Register.tsx
import type React from "react";
import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/auth/AuthContext";
import { Icon } from "../icons/icons";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../utils/api.js";
import type { ApiError } from "@/types/models";

export default function Register() {
    const nav = useNavigate();
    const { register: doRegister, loginWithGoogle } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password2: "",
        accept: false,
    });

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showPwd2, setShowPwd2] = useState(false);

    const pwdScore = useMemo(() => {
        const p = form.password || "";
        let s = 0;
        if (p.length >= 6) s++;
        if (/[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p)) s++;
        return Math.min(s, 4);
    }, [form.password]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setMsg("");

        if (!form.name || !form.email || !form.password) {
            return setErr("All fields are required.");
        }
        if (form.password.length < 6) {
            return setErr("The password must be at least 6 characters long.");
        }
        if (form.password !== form.password2) {
            return setErr("The two passwords do not match.");
        }
        if (!form.accept) {
            return setErr("To register, you must accept the Terms and Conditions and Privacy Policy.");
        }

        setLoading(true);
        try {
            await doRegister(form.name, form.email, form.password);

            setErr("");
            setTimeout(() => nav(`/verify-wait?email=${encodeURIComponent(form.email)}`), 600);
        } catch (eRaw) {
            const e = eRaw as ApiError;
            setErr(e?.response?.data?.error || e?.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={S.page}>
            <div style={S.card}>
                <h1 style={S.title}>Register</h1>

                {err && <div style={S.alert}>{err}</div>}
                {msg && (
                    <div
                        style={{
                            ...S.alert,
                            background: "#f6ffed",
                            border: "1px solid #b7eb8f",
                            color: "#389e0d",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "normal",
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
                                await loginWithGoogle(resp.credential ?? "");

                                setMsg("Successful login with Google account.");
                                setTimeout(() => nav(`/`), 300);
                            } catch (eRaw) {
                                const e = eRaw as ApiError;
                                setErr(e?.response?.data?.error || e?.message || "Google login failed.");
                            }
                        }}
                        onError={() => setErr("Google login failed.")}
                        useOneTap={false}
                    />
                  </div>
                </div>

                <form onSubmit={submit} style={S.form}>
                    <label style={S.label}>
                        <span>Name</span>
                        <input
                            type="text"
                            name="name"
                            placeholder="Full name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            autoComplete="name"
                            style={S.input}
                        />
                    </label>

                    <label style={S.label}>
                        <span>Email</span>
                        <input
                            type="email"
                            name="email"
                            placeholder="mail@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            autoComplete="email"
                            style={S.input}
                        />
                    </label>

                    <label style={S.label}>
                        <span>Password</span>
                        <div style={S.pwdWrap}>
                            <input
                                type={showPwd ? "text" : "password"}
                                name="password"
                                placeholder="Min. 6 characters"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                autoComplete="new-password"
                                minLength={6}
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

                        <div style={S.meterRow}>
                            {[0, 1, 2, 3].map((i) => (
                                <span
                                    key={i}
                                    style={{ ...S.meter, background: i < pwdScore ? meterColor(pwdScore) : "#eee" }}
                                />
                            ))}
                        </div>
                        <small style={{ opacity: 0.7 }}>
                            Tip: use capital letters, numbers and special characters.
                        </small>
                    </label>

                    <label style={S.label}>
                        <span>Password again</span>
                        <div style={S.pwdWrap}>
                            <input
                                type={showPwd2 ? "text" : "password"}
                                name="password2"
                                placeholder="Retype password"
                                value={form.password2}
                                onChange={(e) => setForm({ ...form, password2: e.target.value })}
                                required
                                autoComplete="new-password"
                                style={{ ...S.input, paddingRight: 56 }}
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowPwd2((v) => !v)}
                                aria-label={showPwd2 ? "Hide password" : "Show password"}
                                style={S.eyeBtn}
                                title={showPwd2 ? "Hide" : "Show"}
                            >
                                <Icon name={showPwd2 ? "eyeoff" : "eye"} size={18} strokeWidth={2} style={{ display: "block" }} />
                            </button>
                        </div>
                    </label>

                    <label style={S.checkRow}>
                        <Checkbox
                            checked={form.accept}
                            onCheckedChange={(val) => setForm({ ...form, accept: val === true })}
                            required
                        />
                        <span>
                            I accept the{" "}
                            <Link to="/terms" style={{ textDecoration: "underline", opacity: 0.95 }}>
                                Terms of Use
                            </Link>{" "}
                            and the{" "}
                            <Link to="/privacy" style={{ textDecoration: "underline", opacity: 0.95 }}>
                                Privacy Policy.
                            </Link>
                        </span>
                    </label>

                    <button type="submit" disabled={loading} style={S.submit}>
                        {loading ? "Processing…" : "Register"}
                    </button>

                    <div style={S.bottomRow}>
                        <span>Already have an account?</span> <Link to="/login" style={{ textDecoration: "underline", opacity: 0.95 }}>Login</Link>
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
    meterRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8, marginBottom: -2 },
    meter: { height: 6, borderRadius: 999 },
    checkRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 14, marginTop: 4 },
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
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "normal",
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

function meterColor(score: number) {
    switch (score) {
        case 1: return "#ff6b6b";
        case 2: return "#f7b731";
        case 3: return "#2ed573";
        case 4: return "#1e90ff";
        default: return "#eee";
    }
}
