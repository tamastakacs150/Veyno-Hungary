// client/src/main.jsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import AuthProvider from "./auth/AuthContext";
import { CartProvider } from "./context/CartContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import CookieBanner from "./components/ConsentBanner";
import ScrollToTop from "./components/ScrollToTop";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CurrencyProvider } from "./context/CurrencyContext";
import { GlobalLoadingProvider } from "@/providers/GlobalLoadingProvider";
import Loader from "@/components/ui/loader";
import "./global.css";

// --- ENV variables ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Friendly guards
if (!GOOGLE_CLIENT_ID) {
    console.warn("VITE_GOOGLE_CLIENT_ID is missing from the client/.env file.");
}
if (!STRIPE_PUBLISHABLE_KEY || !/^pk_(test|live)_/.test(STRIPE_PUBLISHABLE_KEY)) {
    console.warn(
        "Missing/incorrect Stripe publishable key. Set it in client/.env: " +
        "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_..."
    );
}

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ""}>
                <AuthProvider>
                    <CartProvider>
                        <CurrencyProvider>
                            <GlobalLoadingProvider>
                                <Suspense
                                    fallback={
                                        <div className="grid place-items-center min-h-screen">
                                            <Loader label="Loading page..." />
                                        </div>
                                    }
                                >
                                    <Elements stripe={stripePromise} options={{ locale: "en" }}>
                                        <ScrollToTop />
                                        <App />
                                    </Elements>
                                    <CookieBanner />
                                </Suspense>
                            </GlobalLoadingProvider>
                        </CurrencyProvider>
                    </CartProvider>
                </AuthProvider>
            </GoogleOAuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
