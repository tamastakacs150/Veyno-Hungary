//client/src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, CreditCard, Truck, Package, Tag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/context/CartContext";
import api from "@/utils/api";
import resolveImg, { candidatesFor } from "@/utils/resolveImg";
import { useStripe, useElements, PaymentRequestButtonElement, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import { useCurrency } from "@/context/CurrencyContext";
import "../styles/Checkout.css";

type CartItem = {
  _id?: string;
  id?: string;
  productId?: string;
  sku?: string;
  name: string;
  price?: number;
  effectivePrice?: number;
  originalPrice?: number;
  quantity: number;
  size?: string | null;
  category?: string | null;
  image?: string | null;
};

type Address = {
  country: string;
  postalCode: string;
  city: string;
  line1: string;
  line2: string;
};

const eff = (p: any) => Number(p?.effectivePrice ?? p?.price ?? 0);
const MIN_HUF = 175;

const getStripeAmountAndCurrency = (usdTotal: number, currencyCode: string, rates: any) => {
  if (!usdTotal) return { amount: 0, currency: currencyCode };

  let amount = Math.round(usdTotal * 100);
  let currency = "USD";

  const rate = rates[currencyCode] || 1;

  if (currencyCode === "HUF") {
    amount = Math.max(MIN_HUF, Math.round(usdTotal * rate));
    currency = "HUF";
  } else if (currencyCode === "EUR") {
    amount = Math.round(usdTotal * rate * 100);
    currency = "EUR";
  } else if (currencyCode === "USD") {
    amount = Math.round(usdTotal * 100);
    currency = "USD";
  }

  return { amount, currency: currency.toLowerCase() };
};

const SHIPPING = {
  standard: { label: "Home delivery (1–3 days)", price: 5, icon: Truck },
  express: { label: "Express (24 hours)", price: 15, icon: Package },
  pickup: { label: "Personal pick up", price: 0, icon: Package },
} as const;

const FREE_SHIP = 100;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [prodMap, setProdMap] = useState<Map<string, any>>(new Map());
  const [cart, setCart] = useState<CartItem[]>([]);
  const { format, rates, currency: currencyCode } = useCurrency();
  const toHUF = (usd: number) => Math.round(Number(usd || 0) * (rates.HUF || 370));

  // Stripe
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canPay, setCanPay] = useState(false);

  // Customer + addresses
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [shippingAddress, setShippingAddress] = useState<Address>({
    country: "US",
    postalCode: "",
    city: "",
    line1: "",
    line2: "",
  });
  const [billingSame, setBillingSame] = useState(true);
  const [billingAddress, setBillingAddress] = useState<Address>({
    country: "US",
    postalCode: "",
    city: "",
    line1: "",
    line2: "",
  });

  // Options
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [saveMyDetails, setSaveMyDetails] = useState(true);
  const [shippingMethod, setShipping] = useState<keyof typeof SHIPPING>("standard");
  const [paymentMethod, setPayment] = useState<"online" | "cash on delivery">("online");
  const [aszfOk, setAszfOk] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Cardholder name
  const [cardholder, setCardholder] = useState("");

  // Coupons
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [validatedCoupon, setValidatedCoupon] = useState<{ id?: string; code?: string } | null>(null);

  useEffect(() => {
    const cameFromVerify = sessionStorage.getItem("arrivedFromVerify") === "1";
    const fromState = (location.state as any)?.cart;

    if (Array.isArray(fromState) && fromState.length) {
      setCart(fromState);
      try {
        localStorage.setItem("cart", JSON.stringify(fromState));
      } catch { }
      if (cameFromVerify) sessionStorage.removeItem("arrivedFromVerify");
      return;
    }

    if (cameFromVerify) {
      try {
        const local = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(Array.isArray(local) ? local : []);
      } catch {
        setCart([]);
      }
      sessionStorage.removeItem("arrivedFromVerify");
      return;
    }

    const token = localStorage.getItem("token");
    const tryLocal = () => {
      try {
        const local = JSON.parse(localStorage.getItem("cart") || "[]");
        setCart(Array.isArray(local) ? local : []);
      } catch {
        setCart([]);
      }
    };

    if (token) {
      api
        .get(`/me/cart`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const items = (res.data?.items || res.data || []).map((x: any) => ({
            _id: x.productId?._id || x.productId,
            name: x.productId?.name ?? x.name,
            price: Number((x.productId?.effectivePrice ?? x.productId?.price ?? x.price) || 0),
            effectivePrice: Number((x.productId?.effectivePrice ?? x.effectivePrice ?? x.price) || 0),
            originalPrice: Number(x.productId?.price ?? x.price ?? 0),
            image: x.productId?.image ?? x.image,
            quantity: Number(x.quantity ?? 1),
            size: x.size || null,
            category: x.category || null,
          }));

          if (Array.isArray(items) && items.length) {
            setCart(items);
            try { localStorage.setItem("cart", JSON.stringify(items)); } catch { }
          } else {
            tryLocal();
          }
        })
        .catch(tryLocal);
    } else {
      tryLocal();
    }
  }, [location.key]);

  // Price helpers
  const subtotal = useMemo(
    () =>
      cart.reduce((s, it) => {
        const pid = String(it.productId || it._id || it.id || it.sku || "");
        const pObj = prodMap.get(pid);
        const unit = Number(pObj?.effectivePrice ?? pObj?.price ?? it.effectivePrice ?? it.price ?? 0);
        const qty = Number(it.quantity || 0);
        return s + unit * qty;
      }, 0),
    [cart, prodMap]
  );

  const shippingCost = useMemo(() => {
    if (!cart.length) return 0;
    if (shippingMethod !== "pickup" && subtotal >= FREE_SHIP) return 0;
    return SHIPPING[shippingMethod]?.price ?? 0;
  }, [cart.length, shippingMethod, subtotal]);

  const total = Math.max(0, subtotal - (discount || 0) + shippingCost);

  // Products map for pricing / images
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/products`);
        if (!alive) return;
        const all = Array.isArray(r.data) ? r.data : [];
        setProdMap(new Map(all.map((p) => [String(p._id || p.id), p])));
      } catch { }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Prefill user from /me
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api
      .get("/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (!data) return;
        setCustomer((c) => ({
          ...c,
          name: data.name || c.name,
          email: data.email || c.email,
          phone: data.phone || c.phone || "",
        }));
        const a = data.defaultAddress || {};
        setShippingAddress((prev) => ({
          country: a.country || prev.country || "US",
          postalCode: a.postalCode || prev.postalCode || "",
          city: a.city || prev.city || "",
          line1: a.line1 || prev.line1 || "",
          line2: a.line2 || prev.line2 || "",
        }));
      })
      .catch(() => { });
  }, []);

  // Create PaymentIntent when online + total set
  useEffect(() => {
    if (paymentMethod !== "online" || !total) return;
    const { amount: stripeAmount, currency: stripeCurrency } = getStripeAmountAndCurrency(total, currencyCode, rates);

    api.post("/create-payment-intent", {
      amount: stripeAmount,
      currency: stripeCurrency,
      customer_email: customer.email || undefined,
    })
      .then((res) => setClientSecret(res.data?.clientSecret || ""))
      .catch(() => setClientSecret(""));

  }, [paymentMethod, total, customer.email, rates, currencyCode]);

  // Create PaymentRequest (Apple/Google Pay)
  useEffect(() => {
    if (!stripe || !clientSecret || paymentMethod !== "online") return;

    const { amount: stripeAmount, currency: stripeCurrency } = getStripeAmountAndCurrency(total, currencyCode, rates);

    const pr = stripe.paymentRequest({
      country: stripeCurrency === "huf" ? "HU" : "US",
      currency: stripeCurrency,
      total: { label: "Purchase", amount: stripeAmount },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result?.canMakePayment) {
        setCanPay(true);
        setPaymentRequest(pr);
      } else {
        setCanPay(false);
        setPaymentRequest(null);
      }
    });

  }, [stripe, clientSecret, paymentMethod, total, rates, currencyCode]);

  // PaymentRequest event
  useEffect(() => {
    if (!paymentRequest || !stripe || !clientSecret) return;
    paymentRequest.on("paymentmethod", async (ev: any) => {
      const { error } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );
      if (error) {
        ev.complete("fail");
        return alert(error.message);
      }
      ev.complete("success");
      const { error: actionErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
      if (actionErr) return alert(actionErr.message);
      await finalizeOrder(paymentIntent?.id);
    });
  }, [paymentRequest, stripe, clientSecret]);

  // Coupon
  async function applyCoupon() {
    const code = (coupon || "").trim().toUpperCase();
    if (!code) {
      setCouponMsg("Enter a coupon code.");
      return;
    }
    if (couponApplied) {
      setCouponMsg("The coupon code has already been applied.");
      return;
    }

    try {
      // API call to check the coupon – 'subtotal' is the net amount of the current cart
      const { data } = await api.post("/checkout/coupons/validate", {
        code,
        orderTotal: Math.max(0, Math.round(subtotal)),
      });

      if (!data?.valid) {
        setCouponMsg(data?.reason === "NOT_ELIGIBLE" ? "This coupon is not eligible for your order." : "Invalid coupon code.");
        return;
      }

      // success: set the discount and message
      setDiscount(Number(data.discountAmount || 0));
      setCouponApplied(true);
      setCouponMsg(data?.message || "Coupon applied.");
      setValidatedCoupon(data?.coupon || null);
    } catch (e: any) {
      setCouponMsg(e?.response?.data?.error || "Coupon validation failed.");
    }
  }

  // Validation
  const shippingValid =
    !!shippingAddress.line1 && !!shippingAddress.city && !!shippingAddress.postalCode && !!shippingAddress.country;
  const billingValid =
    billingSame ||
    (!!billingAddress.line1 && !!billingAddress.city && !!billingAddress.postalCode && !!billingAddress.country);
  const valid =
    cart.length > 0 &&
    customer.name.trim() &&
    /\S+@\S+\.\S+/.test(customer.email) &&
    customer.phone.trim() &&
    shippingValid &&
    billingValid &&
    shippingMethod &&
    paymentMethod &&
    aszfOk;

  // Newsletter
  // Newsletter
  const tryNewsletterSubscribe = async (email?: string, name?: string) => {
    if (!newsletterOptIn || !email) return;
    try {
      const res = await api.post("/newsletter", { email, name });

      // ha be van jelentkezve, állítsuk be a /me/newsletter flaget is
      try {
        const token = localStorage.getItem("token");
        if (token) {
          await api.patch(
            "/me/newsletter",
            { subscribe: true },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (err) {
        console.warn("Profile update failed after newsletter:", err);
      }

      if (res.status === 409 || res.status === 400) return;
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 409 || s === 400) return;
      console.log("Newsletter subscribe error", s, e?.response?.data);
    }
  };

  // Place order
  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!valid) {
      setErr("Please fill in all required fields and accept the Terms and Conditions.");
      return;
    }

    const items = cart.map((it) => ({
      productId: it.productId || it._id || it.id,
      quantity: Number(it.quantity) || 1,
      size: it.size || null,
    }));

    const orderPayload = {
      items,
      customer,
      shippingAddress,
      billingAddress: billingSame ? shippingAddress : billingAddress,
      shippingMethod,
      paymentMethod,
      note,
      newsletterOptIn: !!newsletterOptIn,
      coupon: couponApplied ? (validatedCoupon?.code || (coupon || "").trim().toUpperCase()) : null,
      discount: couponApplied ? discount : 0,
      subtotal,
      shippingCost,
      totalAmount: total,
    };

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      if (saveMyDetails && token) {
        try {
          await api.patch(
            "/me",
            { phone: customer.phone, defaultAddress: billingSame ? shippingAddress : billingAddress },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (saveError) {
          console.warn("Failed to save user details:", saveError);
        }
      }

      await tryNewsletterSubscribe(customer.email, customer.name);

      if (paymentMethod === "online") {
        await payWithCard();
        return;
      }

      // FOLLOW-UP
      const { data } = await api.post(`/checkout`, orderPayload, headers);
      if (data?.orderId) {
        try {
          await clearCart();
        } catch { }
        navigate(`/success?orderId=${encodeURIComponent(data.orderId)}`);
        return;
      }
      setErr("An unknown response was received from the server.");
    } catch (e2: any) {
      setErr(e2?.response?.data?.error || "An error occurred during the order.");
    } finally {
      setLoading(false);
    }
  };

  async function payWithCard() {
    if (!stripe || !elements || !clientSecret) {
      setErr("Payment is being initialized. Please try again in a few seconds.");
      return;
    }
    const card = elements.getElement(CardNumberElement);
    if (!card) {
      setErr("Fill in the card field or use the Apple/Google Pay button.");
      return;
    }
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card, billing_details: { name: cardholder || customer.name || undefined } },
    });
    if (error) {
      setErr(error.message || "Card payment failed.");
      return;
    }
    await finalizeOrder(paymentIntent?.id);
  }

  async function finalizeOrder(paymentIntentId?: string | null) {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      const payload = {
        items: cart.map((it) => ({
          productId: it.productId || it._id || it.id,
          quantity: Number(it.quantity) || 1,
          size: it.size || null,
        })),
        customer,
        shippingAddress,
        billingAddress: billingSame ? shippingAddress : billingAddress,
        shippingMethod,
        paymentMethod: "online-elements",
        note,
        newsletterOptIn: !!newsletterOptIn,
        coupon: couponApplied ? (validatedCoupon?.code || (coupon || "").trim().toUpperCase()) : null,
        discount: couponApplied ? discount : 0,
        subtotal,
        shippingCost,
        totalAmount: total,
        stripePaymentIntentId: paymentIntentId || null,
      };

      const { data } = await api.post(`/checkout`, payload, headers);
      if (data?.orderId) {
        try {
          await clearCart();
        } catch { }
        navigate(`/success?orderId=${encodeURIComponent(data.orderId)}`);
      } else {
        setErr("Payment was successful, but the order could not be saved. Please contact us.");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Error completing order.");
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Checkout
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Secure payment with SSL encryption</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left column – form */}
          <div className="lg:col-span-3 space-y-6 min-w-0">
            {/* Personal data */}
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Personal data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {err && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {err}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    Name *
                  </label>
                  <Input
                    id="name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Full name"
                    className="bg-background/50"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    E-mail *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="mail@example.com"
                    className="bg-background/50"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium">
                    Phone number *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="+36 1 317 4567"
                    className="bg-background/50"
                    autoComplete="tel"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping address */}
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="country" className="block text-sm font-medium">
                      Country *
                    </label>
                    <Input
                      id="country"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="postalCode" className="block text-sm font-medium">
                      Postal code *
                    </label>
                    <Input
                      id="postalCode"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      placeholder="1234"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-medium">
                    City *
                  </label>
                  <Input
                    id="city"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    placeholder="Los Angeles"
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="line1" className="block text-sm font-medium">
                    Street, house number *
                  </label>
                  <Input
                    id="line1"
                    value={shippingAddress.line1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                    placeholder="Lincoln blvd. 317."
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="line2" className="block text-sm font-medium">
                    Floor/door (optional)
                  </label>
                  <Input
                    id="line2"
                    value={shippingAddress.line2}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                    placeholder="2. floor 5."
                    className="bg-background/50"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="billingSame" checked={billingSame} onCheckedChange={(c) => setBillingSame(!!c)} />
                  <label htmlFor="billingSame" className="font-normal cursor-pointer">
                    My billing information matches my shipping information
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Billing address (if not matching) */}
            {!billingSame && (
              <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Billing address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="billingCountry" className="block text-sm font-medium">
                        Country *
                      </label>
                      <Input
                        id="billingCountry"
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="billingPostalCode" className="block text-sm font-medium">
                        Postal code *
                      </label>
                      <Input
                        id="billingPostalCode"
                        value={billingAddress.postalCode}
                        onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                        placeholder="1234"
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="billingCity" className="block text-sm font-medium">
                      City *
                    </label>
                    <Input
                      id="billingCity"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                      placeholder="Los Angeles"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="billingLine1" className="block text-sm font-medium">
                      Street, house number *
                    </label>
                    <Input
                      id="billingLine1"
                      value={billingAddress.line1}
                      onChange={(e) => setBillingAddress({ ...billingAddress, line1: e.target.value })}
                      placeholder="Lincoln blvd. 317."
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="billingLine2" className="block text-sm font-medium">
                      Floor/door (optional)
                    </label>
                    <Input
                      id="billingLine2"
                      value={billingAddress.line2}
                      onChange={(e) => setBillingAddress({ ...billingAddress, line2: e.target.value })}
                      placeholder="2. floor 5."
                      className="bg-background/50"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping method */}
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle>Shipping method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={shippingMethod} onValueChange={(v) => setShipping(v as any)}>
                  <div className="space-y-3">
                    {(Object.entries(SHIPPING) as [keyof typeof SHIPPING, any][]).map(([key, option]) => {
                      const Icon = option.icon;
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${shippingMethod === key ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                            }`}
                          onClick={() => setShipping(key)}
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={key} id={key} />
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <label htmlFor={key} className="font-medium cursor-pointer">
                              {option.label}
                            </label>
                          </div>
                          <span className="font-semibold">
                            {option.price ? format(option.price) : "Free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
                {shippingMethod !== "pickup" && subtotal >= FREE_SHIP && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Your order has reached free shipping
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Method + Stripe Dropdown Fields */}
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPayment(v as any)}>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                        }`}
                      onClick={() => setPayment("online")}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="online" id="online" />
                        <label htmlFor="online" className="font-medium cursor-pointer">
                          Online payment (bank card, Apple Pay, Google Pay)
                        </label>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${paymentMethod === "cash on delivery" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                        }`}
                      onClick={() => setPayment("cash on delivery")}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="cash on delivery" id="cash on delivery" />
                        <label htmlFor="cash on delivery" className="font-medium cursor-pointer">
                          Cash on delivery
                        </label>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {/* Drop-down online payment UI */}
                {paymentMethod === "online" && (
                  <div className="space-y-3 pt-4">
                    {canPay && paymentRequest && (
                      <div className="mb-2">
                        <PaymentRequestButtonElement
                          options={{
                            paymentRequest,
                            style: { paymentRequestButton: { type: "buy", theme: "dark", height: "44px" } },
                          }}
                        />
                      </div>
                    )}

                    {/* Multi-field Stripe form */}
                    <div className="border border-input bg-background rounded-xl p-4 min-w-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">Card number</label>
                          <div className="border border-input rounded-lg px-3 py-2">
                            <CardNumberElement options={{ showIcon: true }} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">Expires (MM/YY)</label>
                          <div className="border border-input rounded-lg px-3 py-2">
                            <CardExpiryElement />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">CVC</label>
                          <div className="border border-input rounded-lg px-3 py-2">
                            <CardCvcElement />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-sm font-medium">Cardholder</label>
                          <input
                            className="border border-input rounded-lg px-3 py-2 bg-background outline-none"
                            value={cardholder}
                            onChange={(e) => setCardholder(e.target.value)}
                            placeholder="Name on the card"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        You can pay with Apple/Google Pay (if available) or fill in the card fields.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Note + options */}
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <label htmlFor="note" className="block text-sm font-medium">
                    Note (optional)
                  </label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Special request, doorbell, etc."
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter" checked={newsletterOptIn} onCheckedChange={(c) => setNewsletterOptIn(!!c)} />
                    <label htmlFor="newsletter" className="font-normal cursor-pointer">
                      Subscribe to the newsletter
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="saveDetails" checked={saveMyDetails} onCheckedChange={(c) => setSaveMyDetails(!!c)} />
                    <label htmlFor="saveDetails" className="font-normal cursor-pointer">
                      Save my details for next order
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" checked={aszfOk} onCheckedChange={(c) => setAszfOk(!!c)} />
                    <label htmlFor="terms" className="font-normal cursor-pointer text-sm leading-relaxed">
                      I accept <Link to="/terms" className="text-primary hover:underline">Terms Of Use</Link> and
                      the {" "}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>.
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column – summary */}
          <div className="lg:col-span-2 min-w-0">
            <div className="lg:sticky lg:top-6">
              <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Order summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!cart.length ? (
                    <p className="text-muted-foreground text-center py-8">Cart is empty.</p>
                  ) : (
                    <>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {cart.map((i) => {
                          const key = String(i._id || i.productId || i.id);
                          const src = resolveImg(i as any);
                          const pid = String(i.productId || i._id || i.id || i.sku || "");
                          const pObj = prodMap.get(pid);
                          const now = Number(pObj?.effectivePrice ?? pObj?.price ?? i.effectivePrice ?? i.price ?? 0);
                          const orig = Number(pObj?.price ?? i.originalPrice ?? i.price ?? now);
                          return (
                            <div key={key} className="flex gap-3">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={src}
                                  alt={i.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const list = candidatesFor(i as any, 1);
                                    const current = (e.currentTarget as HTMLImageElement).src;
                                    const next = list.find((u) => u !== current);
                                    (e.currentTarget as HTMLImageElement).src = next || "/placeholder.svg";
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold mb-2 break-words line-clamp-2">{i.name}</h3>
                                {i.size && <p className="text-xs text-muted-foreground">Size: {i.size}</p>}
                                <div className="flex items-center gap-2 text-sm mt-1">
                                  {orig > now && (
                                    <span className="line-through text-muted-foreground text-xs">
                                      {format(orig)}
                                    </span>
                                  )}
                                  <span className="font-semibold">{format(now)}</span>
                                  <span className="text-muted-foreground">× {i.quantity}</span>
                                </div>
                              </div>
                              <div className="font-semibold text-sm">{format(now * Number(i.quantity || 0))}</div>
                            </div>
                          );
                        })}
                      </div>

                      <Separator />

                      {/* Coupon */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={coupon}
                              onChange={(e) => setCoupon(e.target.value)}
                              placeholder="Coupon code"
                              disabled={couponApplied}
                              className="pl-9 bg-background/50"
                            />
                          </div>
                          <Button variant="outline" onClick={applyCoupon} disabled={couponApplied || !coupon.trim()}>
                            {couponApplied ? "Applied" : "Redeem"}
                          </Button>
                        </div>
                        {couponMsg && (
                          <p
                            className={`text-sm ${couponApplied ? "text-green-600 dark:text-green-400" : "text-destructive"
                              }`}
                          >
                            {couponMsg}
                          </p>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-semibold">{format(subtotal)}</span>
                        </div>

                        {couponApplied && (
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span>Discount (10%)</span>
                            <span className="font-semibold">-{format(discount)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping</span>
                          <span className="font-semibold">{shippingCost ? format(shippingCost) : "Free"}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center text-lg">
                        <span className="font-bold">Total</span>
                        <span className="text-2xl font-bold">{format(total)}</span>
                      </div>

                      <Button size="lg" className="w-full" onClick={placeOrder} disabled={!valid || loading}>
                        {loading ? "Payment in progress…" : "Place an order"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
