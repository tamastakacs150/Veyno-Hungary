// src/pages/Verify.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/api.js";
import { useAuth } from "@/auth/AuthContext";
import { CheckCircle2, AlertCircle, Home, LogIn, Loader2, Mail, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Verify() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();
  const token = sp.get("token");
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    let alive = true;
    async function run() {
      setLoading(true);
      setOk("");
      setErr("");
      try {
        if (!token) {
          setErr("Missing token.");
          return;
        }
        const { data } = await api.post("/auth/verify", { token });
        if (!alive) return;
        
        if (data?.token && data?.user) {
          if (window.opener) {
            try {
              window.opener.postMessage(
                { type: "EMAIL_VERIFIED", user: data.user, token: data.token },
                window.location.origin
              );
            } catch {}
            setOk("Verification successful! You can safely close this window.");
            setTimeout(() => { try { window.close(); } catch {} }, 150);
            return;
          }
          try {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
          } catch {}
          setOk("Verification successful! You can close this window and return to the page.");
          return;
        }

      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.error || "Invalid or expired verification link.");
      } finally {
        alive && setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <Card className="w-full max-w-2xl animate-fade-in shadow-2xl border-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />

        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-base">
            We're confirming your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading && (
            <Alert className="border-2 border-primary/20 bg-primary/5 animate-fade-in">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <AlertDescription className="ml-2 font-semibold text-foreground flex items-center gap-2">
                <span>Verifying your email</span>
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </AlertDescription>
            </Alert>
          )}

          {!loading && ok && (
            <Alert className="border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 animate-scale-in">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertDescription className="ml-2 font-semibold text-green-700 dark:text-green-300">
                {ok}
              </AlertDescription>
            </Alert>
          )}

          {!loading && err && (
            <Alert className="border-2 border-destructive/50 bg-destructive/5 animate-scale-in">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertDescription className="ml-2 font-semibold text-destructive">
                {err}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild variant="lg" size="lg" className="min-w-[140px] hover-scale bg-black text-white hover:bg-gray-900">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>

          <div className="pt-6 text-center border-t">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your <strong>spam folder</strong>, or try registering again with the correct address.
            </p>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, hsl(var(--primary) / 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
