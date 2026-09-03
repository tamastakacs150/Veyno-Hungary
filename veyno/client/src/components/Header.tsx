// client/src/components/Header.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, Heart, ShoppingCart, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useAuth } from "@/auth/AuthContext";
import { useCart } from "@/context/CartContext";
import useWishlist from "@/hooks/useWishlist";
import api from "@/utils/api.js";

type Category = { slug: string; title: string; to: string };

export default function FancyHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);

  const { user, logout, updateUser } = useAuth() || {};
  const { totalCount = 0 } = useCart() || { totalCount: 0 };
  const { ids: favIds = [] } = useWishlist() || { ids: [] };
  const favCount = favIds.length;

  const [showSearch, setShowSearch] = useState(false);
  const [searchAnimating, setSearchAnimating] = useState<"open" | "close" | null>(null);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Account menu
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountBtnRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // SAME glass for header and search bar
  const glass =
    "bg-black/60 backdrop-blur-sm border-white/10 supports-[backdrop-filter]:bg-black/40 supports-[backdrop-filter]:backdrop-blur-md";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("q") || "");
  }, [location.search]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowAccountMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAnimate(true);
    }, 600);

    return () => {
      clearTimeout(t);
      setAnimate(false);
    };
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories");
        const mapped: Category[] = (Array.isArray(data) ? data : []).map((c: any) => {
          const slug = String(c.slug || c.name || "").toLowerCase();
          return { slug, title: String(c.title || c.name || ""), to: `/category/${slug}` };
        });
        setCategories(mapped);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  // Click outside the account menu
  useEffect(() => {
    if (!showAccountMenu) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(t) &&
        accountBtnRef.current &&
        !accountBtnRef.current.contains(t)
      ) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showAccountMenu]);

  const menuItems: Category[] = [
    { slug: "all", title: "All Products", to: "/" },
    ...categories,
    { slug: "about", title: "About", to: "/about" },
  ];

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    navigate(val ? `/?q=${encodeURIComponent(val)}` : "/");
  };

  // Icon button – white icon, no hover background/color change
  const iconButtonClass =
    "text-white p-1 hover:bg-transparent focus:bg-transparent active:bg-transparent " +
    "hover:text-white focus:text-white active:text-white " +
    "[&_svg]:text-white [&_svg]:hover:text-white [&_svg]:focus:text-white";

  // Account icon logic:
  // - if NO user -> /login
  // - if YES user -> open/close dropdown menu

  const handleAccountClick = async () => {
    // if there is a user -> toggle
    if (user) {
      setShowAccountMenu(v => !v);
      return;
    }

    // if there is no user, but you may be logged in based on a cookie:
    try {
      const { data } = await api.get("/auth/me");
      if (data) {
        // manually set the context user to immediately display the menu
        if (updateUser) updateUser(data);
        setShowAccountMenu(true);
        return;
      }
    } catch {
      // not logged in
    }

    navigate("/login");
  };


  const doLogout = async () => {
    try {
      if (typeof logout === "function") await logout();
    } finally {
      setShowAccountMenu(false);
      navigate("/");
    }
  };

  return (
    <>
      <div className={`header-glass-overlay ${showSearch ? "open" : ""} ${showAccountMenu ? "account-open" : ""}`} />
      <header className={"fixed top-0 left-0 right-0 z-50 w-full site-header text-white " + (animate ? "animate-in-view" : "")}>
        <div className="w-full flex items-center justify-between h-[56px] px-2">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={`md:hidden ${iconButtonClass}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              title="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            <Link to="/" className="flex items-center gap-2 text-white" aria-label="Home">
              <img src="/logo/logo_veyno.svg" alt="Veyno" className="h-5" />
              <img src="/logo/title_veyno.svg" alt="VEYNO" className="h-4" />
            </Link>
          </div>

          {/* Middle: categories (desktop) */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium hdr-center">
            {menuItems.map((item, i) => (
              <Link
                key={item.slug}
                to={item.to}
                className={cn(
                  "px-3 py-[6px] rounded-md transition-colors duration-200 hdr-anim-item",
                  isActive(item.to) ? "bg-white/10 text-white" : "text-white/85 hover:bg-white/10"
                )}
                style={{ ["--i" as any]: i }}
              >
                {item.title}
              </Link>
            ))}

          </nav>

          {/* Right: icons */}
          <div className="flex items-center gap-1.5 relative hdr-right">
            <Button
              variant="ghost"
              size="icon"
              className={`${iconButtonClass} hdr-anim-item--right`}
              style={{ ["--i" as any]: 0 }}
              onClick={() => {
                if (showSearch) {
                  setSearchAnimating("close");
                  setTimeout(() => {
                    setShowSearch(false);
                    setSearchAnimating(null);
                  }, 200);
                } else {
                  setShowSearch(true);
                  setSearchAnimating("open");
                  setTimeout(() => setSearchAnimating(null), 220);
                }
              }}
              aria-label="Search"
              title="Search"
            >
              <Search size={18} />
            </Button>

            {/* Favorites – badge WITHOUT background, just white number */}
            <Link to="/favorites" aria-label="Favorites" title="Favorites">
              <Button variant="ghost" size="icon" className={`relative ${iconButtonClass} hdr-anim-item--right`} style={{ ["--i" as any]: 1 }}>
                <Heart size={18} />
                {favCount > 0 && (
                  <span
                    className="pointer-events-none select-none absolute -top-0 -right-0 text-[11px] leading-none text-white font-semibold"
                    aria-hidden="true"
                  >
                    {favCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Cart – badge WITHOUT background, just white number */}
            <Link to="/cart" aria-label="Cart" title="Cart">
              <Button variant="ghost" size="icon" className={`relative ${iconButtonClass} hdr-anim-item--right`} style={{ ["--i" as any]: 2 }}>
                <ShoppingCart size={18} />
                {totalCount > 0 && (
                  <span
                    className="pointer-events-none select-none absolute -top-0 -right-0 text-[11px] leading-none text-white font-semibold"
                    aria-hidden="true"
                  >
                    {totalCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Account → /login or drop-down menu */}
            <Button
              ref={accountBtnRef}
              variant="ghost"
              size="icon"
              className={`${iconButtonClass} hdr-anim-item--right`}
              style={{ ["--i" as any]: 3 }}
              onClick={handleAccountClick}
              aria-label="Account"
              aria-haspopup={!!user}
              aria-expanded={!!user && showAccountMenu}
              title="Account"
            >
              <User size={18} />
            </Button>

            {/* Account dropdown menu (only if logged in) */}
            {user && showAccountMenu && (
              <div
                ref={accountMenuRef}
                className="fixed right-3 top-[calc(var(--hdr-h,56px)+8px)] z-[1000] min-w-[200px]
                              rounded-lg bg-[rgba(28,28,28,0.5)]
                              backdrop-blur-[10px] backdrop-saturate-150
                              shadow-[0_8px_24px_rgba(0,0,0,.30)]
                              ring-0 border-none outline-none animate-[slideDown_140ms_ease-out] text-white"
              >
                <nav className="py-1 text-sm text-white">
                  {user?.role !== "admin" && (
                    <>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigate("/account");
                        }}
                      >
                        Account settings
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigate("/orders");
                        }}
                      >
                        Orders
                      </button>
                      <div className="my-1 h-px bg-white/10" />
                    </>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 text-red-500 hover:text-red-400 hover:bg-white/10 transition-colors font-semibold"
                    onClick={doLogout}
                  >
                    Logout
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SEARCH BAR (same glass, NO inner black box) */}
      {showSearch && (
        <div
          className={cn(
            "search-bar-row",
            searchAnimating === "open" && "opening",
            searchAnimating === "close" && "closing"
          )}
        >
          <div className="w-full flex items-center gap-2 px-4 py-2 h-[48px]">
            <Search size={16} className="text-white/70 shrink-0" />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="hdr-search w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* MOBIL MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-[56px] h-[calc(100vh-56px)] w-72 max-w-[85vw] bg-black/85 backdrop-blur-sm border-r border-white/10 shadow-lg overflow-y-auto">
            <nav className="p-4 text-sm text-white">
              {menuItems.map((item) => (
                <Link
                  key={item.slug}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-md transition-colors",
                    isActive(item.to) ? "bg-white/10 text-white" : "text-white/85 hover:bg-white/10"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Slide-down keyframes */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* header search input clear (X) button – legyen fehér és kattintható */
        .hdr-search::-webkit-search-cancel-button {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          cursor: pointer;
          background: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.1 3.1a.7.7 0 011 0L7 6l2.9-2.9a.7.7 0 111 1L8 7l2.9 2.9a.7.7 0 11-1 1L7 8l-2.9 2.9a.7.7 0 11-1-1L6 7 3.1 4.1a.7.7 0 010-1z' fill='white'/%3E%3C/svg%3E") no-repeat center center;
          opacity: 0.85;
        }
        .hdr-search::-webkit-search-cancel-button:hover {
          opacity: 1;
        }

        /* Firefox */
        .hdr-search::-moz-search-clear {
          -moz-appearance: none;
          height: 14px;
          width: 14px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
