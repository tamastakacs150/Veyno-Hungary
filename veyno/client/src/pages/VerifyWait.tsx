// src/pages/VerifyWait.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { CheckCircle2, Clock, Home, HelpCircle, Inbox, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VerifyWait() {
  const [sp] = useSearchParams();
  const email = sp.get("email") || "";
  const nav = useNavigate();
  const location = useLocation() as any;
  const cartFromState = location?.state?.cart || null;
  const [status, setStatus] = useState<"idle"|"waiting"|"verified">("waiting");
  const [msg, setMsg] = useState("Check your email - we have sent a confirmation email.");
  const tickRef = useRef<number | null>(null);

  const goto = () => {
    const tgt = sessionStorage.getItem("postVerifyRedirect");
    if (tgt === "checkout") {
      sessionStorage.removeItem("postVerifyRedirect");
      sessionStorage.setItem("arrivedFromVerify", "1");
      nav("/checkout", {
        replace: true,
        state: cartFromState ? { from: "cart", cart: cartFromState } : undefined,
      });
    } else {
      nav("/", { replace: true });
    }
  };

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [u, d] = email.split("@");
    if (!d) return email;
    const mu = u.length <= 2 ? u[0] + "*" : u[0] + "*".repeat(Math.max(1, u.length - 2)) + u.slice(-1);
    return `${mu}@${d}`;
  }, [email]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "token" && e.newValue) {
        setStatus("verified");
        setMsg(
          sessionStorage.getItem("postVerifyRedirect") === "checkout"
            ? "Confirmation successful! Redirecting to checkout…"
            : "Confirmation successful! Redirecting to the main page…"
        );
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [nav]);

  useEffect(() => {
    const check = () => {
      try {
        const t = localStorage.getItem("token");
        if (t) {
          setStatus("verified");
        }
      } catch {}
    };
    tickRef.current = window.setInterval(check, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [nav]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <Card className="w-full max-w-2xl animate-fade-in shadow-2xl border-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" style={{
          animation: status === "waiting" ? "shimmer 2s infinite" : "none"
        }} />

        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
            {status === "verified" ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 animate-scale-in" />
            ) : (
              <Inbox className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Email confirmation
          </CardTitle>
          <CardDescription className="text-base">
            {maskedEmail ? (
              <>Confirmation email sent to <strong className="text-foreground">{maskedEmail}</strong></>
            ) : (
              "Check your email account."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-accent/20 rounded-lg p-4 border-2 border-accent/30">
            <p className="text-center text-sm leading-relaxed">
              Please click the <strong className="text-primary">Verify</strong> button in the email to continue.
            </p>
          </div>

          {status === "waiting" && (
            <Alert className="border-2 border-primary/20 bg-primary/5 animate-fade-in">
              <Clock className="h-5 w-5 text-primary animate-pulse" />
              <AlertDescription className="ml-2 font-semibold text-foreground flex items-center gap-2">
                <span>Waiting for confirmation</span>
                <Sparkles className="w-4 h-4 text-primary" style={{ animation: "pulse 1.5s infinite" }} />
              </AlertDescription>
            </Alert>
          )}

          {status === "verified" && (
            <Alert className="border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 animate-scale-in">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertDescription className="ml-2 font-semibold text-green-700 dark:text-green-300">
                {msg}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Can't find the email?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Look at the <strong>Spam / Promotions</strong> folder too.</li>
                  <li>Please wait a few minutes – the email may be delayed.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild variant="outline" size="lg" className="min-w-[180px] hover-scale">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to the main page
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="min-w-[180px] hover-scale">
              <Link to="/contact">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .bg-grid-pattern {
          background-image: radial-gradient(circle, hsl(var(--primary) / 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
