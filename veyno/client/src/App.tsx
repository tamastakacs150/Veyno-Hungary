// client/src/App.tsx
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast"; 
import RouteLoadingOverlay from "@/components/RouteLoadingOverlay";

// Lazy pages
const Home = lazy(() => import("./pages/Home"));
const Product = lazy(() => import("./pages/Product"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const Cart = lazy(() => import("./pages/Cart"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Verify = lazy(() => import("./pages/Verify"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Favorites = lazy(() => import("./pages/Favorites"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VerifyWait = lazy(() => import("./pages/VerifyWait"));
const LoginFromCart = lazy(() => import("./pages/LoginFromCart"));
const RegisterFromCart = lazy(() => import("./pages/RegisterFromCart"));
const UnsubscribedSuccess = lazy(() => import("./pages/UnsubscribedSuccess"));

// Permanent components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Chatbot from "./pages/Chatbot";
import { useAuth } from "./auth/AuthContext";
import ScrollToTop from "./components/ScrollToTop";

// --- Two layouts: no offset (Home) and offset (everything else) ---
const HEADER_H = 56;

function AppRoot() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);
}

function NoOffsetLayout() {
  return (
    <main className="layout-main no-header-offset">
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </main>
  );
}

function OffsetLayout() {
  return (
    <main className="layout-main" style={{ paddingTop: `${HEADER_H}px` }}>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </main>
  );
}

// Admins only — everyone else will be sent to HOME
function AdminRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/" replace />;
    return children;
}

// Protected path
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {

  const { user, loginWithToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const onScroll = () => {
      const scroller = document.querySelector('.layout-main') || document.querySelector('.layout');
      if (scroller) {
        document.documentElement.classList.toggle("scrolled", scroller.scrollTop > 4);
      }
    };
    
    const scroller = document.querySelector('.layout-main') || document.querySelector('.layout');
    if (scroller) {
        scroller.addEventListener("scroll", onScroll, { passive: true });
    }
    
    onScroll();

    return () => {
        if (scroller) {
            scroller.removeEventListener("scroll", onScroll);
        }
    }
  }, []);
  
  useEffect(() => {
    async function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (m && m.type === "EMAIL_VERIFIED" && m.user && m.token) {
        await loginWithToken(m.user, m.token);
        toast({
            title: "Verification Success!",
            description: "We have logged you in automatically.",
            variant: "success",
        });
        const tgt = sessionStorage.getItem("postVerifyRedirect");
        if (tgt === "checkout") {
          sessionStorage.removeItem("postVerifyRedirect");
          navigate("/checkout", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [loginWithToken]);

  useEffect(() => {
    if (user?.role === "admin" && !window.location.pathname.startsWith("/admin")) {
        window.location.replace("/admin");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const p = location.pathname || "";
    const tgt = sessionStorage.getItem("postVerifyRedirect");

    // Registration/verify initiated from cart: proceed to checkout and we'll stay there
    if ((p === "/verify" || p === "/verify-wait" || p.startsWith("/verify")) && tgt === "checkout") {
      sessionStorage.removeItem("postVerifyRedirect");
      navigate("/checkout", { replace: true });
      return;
    }

    // General case: don't leave the logged in user on the login/register pages
    if (p === "/register" || p === "/login") {
      navigate("/", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="layout">
      <RouteLoadingOverlay />
      <Header />
      <Sidebar />

    <Suspense fallback={null}>
      <Routes>
        {/* Home: NO offset */}
        <Route element={<NoOffsetLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<Home />} />
        </Route>

        {/* Everything else: HAS offset (56px) */}
        <Route element={<OffsetLayout />}>
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/loginfromcart" element={<LoginFromCart />} />
          <Route path="/register" element={<Register />} />
          <Route path="/registerfromcart" element={<RegisterFromCart />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify-wait" element={<VerifyWait />} />
          <Route path="/unsubscribed-successfully" element={<UnsubscribedSuccess />} />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <ScrollToTop />
                <Account />
              </ProtectedRoute>
            }
          />

          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Admin site */}
          <Route path="/admin" element={ <AdminRoute> <AdminDashboard /> </AdminRoute> } />

          {/* Fallback is also offset (not home) */}
          <Route path="*" element={<NotFound />} />
          </Route>
      </Routes>
    </Suspense>
    <Chatbot />
    <Footer />
    <Toaster />
    </div>
  );
}
