// client/src/components/Footer.tsx
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, FlagEU, FlagUS, FlagHU } from "@/icons/icons";
import CurrencySelect from "@/components/CurrencySelect";
import { useCurrency } from "@/context/CurrencyContext";
import "../styles/Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const { currency } = useCurrency();

  useEffect(() => {
  const node = footerRef.current;
  if (!node) return;

  // Delayed observation – e.g. waiting for slider and products to load
  const startObservation = () => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            });
        },
        { threshold: 0.1 }
        );
        observer.observe(node);
    };

  // 1.2 second delay after first render
  const delayTimer = setTimeout(startObservation, 1200);

  return () => clearTimeout(delayTimer);
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMsg(data?.msg || (res.ok ? "Subscribe Successful!" : "There was an error!"));
      if (res.ok) setEmail("");
    } catch {
      setMsg("Network error");
    }
  }

  return (
    <footer
      ref={footerRef}
      className={`site-footer relative mt-auto overflow-hidden pb-12 ${visible ? "animate-in-view" : ""}`}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />

      {/* Ambient glow effects */}
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="py-8 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">
            {/* Brand Section (4 columns) */}
            <div className="lg:col-span-4 space-y-4">
              <Link
                to="/"
                className="inline-block group footer-anim-item"
                style={{ ["--i" as any]: 0 }}
              >
                <img
                  src="/logo/title_veyno.svg"
                  alt="Veyno"
                  className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                />
              </Link>

              <p
                className="text-sm leading-relaxed footer-anim-item"
                style={{ ["--i" as any]: 1 }}
              >
                Premium quality products, that combine style and elegance.
              </p>

              <div
                className="flex gap-3"
                /* Container doesn't animate, children do */
              >
                {[
                  { Icon: TikTokIcon, href: "https://tiktok.com/", title: "TikTok" },
                  { Icon: InstagramIcon, href: "https://instagram.com/", title: "Instagram" },
                  { Icon: FacebookIcon, href: "https://facebook.com/", title: "Facebook" },
                  { Icon: YouTubeIcon, href: "https://youtube.com/", title: "YouTube" },
                ].map(({ Icon, href, title }, i) => (
                  <a
                    key={title}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={title}
                    className="social-btn group relative flex items-center justify-center w-11 h-11 rounded-xl backdrop-blur-sm footer-anim-item"
                    style={{ ["--i" as any]: 2 + i }}
                  >
                    <Icon
                      size={20}
                      className="relative z-10 transition-all duration-300 group-hover:scale-110"
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter Section (4 columns) */}
            <div className="lg:col-span-4 space-y-4">
              <div
                className="space-y-3 footer-anim-item"
                style={{ ["--i" as any]: 6 }}
              >
                <h4 className="text-lg font-semibold">Subscribe to our newsletter!</h4>
                <p className="text-sm">
                  Don't miss our newest products, and get 10% off your first order!
                </p>
              </div>

              <form
                onSubmit={handleSubscribe}
                className="space-y-3 footer-anim-item"
                style={{ ["--i" as any]: 7 }}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1 footer-anim-item" style={{ ["--i" as any]: 8 }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      autoComplete="email"
                      inputMode="email"
                      className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 focus:outline-none focus:ring-2 backdrop-blur-sm bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden group footer-anim-item"
                    style={{ ["--i" as any]: 9 }}
                  >
                    <span className="relative z-10">Subscribe</span>
                  </button>
                </div>

                {msg && (
                  <p className="text-sm px-1 footer-anim-item" style={{ ["--i" as any]: 10 }}>
                    {msg}
                  </p>
                )}
              </form>
            </div>

            {/* Empty Spacer column */}
            <div className="hidden lg:block lg:col-span-1" aria-hidden="true" />

            {/* Links Section (3 columns) */}
            <nav
              className="lg:col-span-3 space-y-4"
              aria-label="Footer navigation"
            >
              <h4
                className="text-sm font-semibold uppercase tracking-wider footer-anim-item"
                style={{ ["--i" as any]: 11 }}
              >
                LEGAL
              </h4>
              <ul className="space-y-3">
                {[
                  { to: "/contact", label: "Contact Us" },
                  { to: "/terms", label: "Terms of Service" },
                  { to: "/privacy", label: "Privacy Policy" },
                  { to: "/about", label: "About Us" },
                ].map(({ to, label }, idx) => (
                  <li
                    key={to}
                    className="footer-anim-item"
                    style={{ ["--i" as any]: 12 + idx }}
                  >
                    <Link
                      to={to}
                      className="inline-block text-sm transition-all duration-300 hover:translate-x-1 relative group"
                    >
                      <span className="link-underline">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t py-4 footer-anim-item" style={{ ["--i" as any]: 16 }}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>© {year} VEYNO — All rights reserved.</p>

            <div className="flex items-center gap-0">
              <span className="text-xs text-muted-foreground">Currency:</span>
              <CurrencySelect />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
