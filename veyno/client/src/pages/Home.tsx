//client/src/pages/Home.tsx
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import { useCart } from "@/context/CartContext";
import resolveImg, { candidatesFor } from "../utils/resolveImg.js";
import useWishlist from "../hooks/useWishlist";
import { toast } from "../utils/toast.js";
import "../styles/Home.css";

import HeroSlider from "@/components/HeroSlider";
import ProductGrid from "@/components/ProductGrid";
import FilterBar from "@/components/FilterBar";
import type { Product as ProductModel } from "@/types/models";

export default function Home() {
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [sort, setSort] = useState("");
  const location = useLocation();
  const nav = useNavigate();
  const { slug } = useParams();
  const productsAnchorRef = useRef<HTMLDivElement | null>(null);

  const norm = (s: any) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // URL params
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const q = params.get("q") || "";
  const qMin = params.get("min") || "";
  const qMax = params.get("max") || "";
  const qStock = params.get("stock") === "1";
  const qBrand = params.get("brand") || "";

  // local inputs
  const [search, setSearch] = useState(q);
  const [min, setMin] = useState(qMin);
  const [max, setMax] = useState(qMax);
  const [onlyInStock, setOnlyInStock] = useState(qStock);

  // mobile filter panel open
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => { setMin(qMin); }, [qMin]);
  useEffect(() => { setMax(qMax); }, [qMax]);
  useEffect(() => { setOnlyInStock(qStock); }, [qStock]);

  const measureGridWidth = useCallback(() => {
    const grid = document.querySelector(".product-grid") as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const w = Math.max(0, rect.width || 0);

    // only apply on desktop
    if (window.innerWidth >= 769) setGridWidth(w);
    else setGridWidth(null);
  }, []);

  const updateQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const p = new URLSearchParams(location.search);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      });
      nav(
        { pathname: location.pathname, search: `?${p.toString()}` },
        { replace: true, preventScrollReset: true }
      );
    },
    [location.pathname, location.search, nav]
  );

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get(`/products`)
      .then((res) => {
        if (!alive) return;
        setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Product retrieval error:", err);
        if (!alive) return;
        setError("Oops, failed to load products.");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onInv = (e: any) => {
      const changes = Array.isArray(e?.detail) ? e.detail : [];
      if (!changes.length) return;
      setProducts((prev) => {
        const dec = new Map(changes.map((c: any) => [String(c.productId), Number(c.quantity || 0)]));
        return (prev || []).map((p: any) => {
          const q = dec.get(String(p._id));
          if (!q) return p;
          const next = Math.max(0, Number(p.stock || 0) - Number(q));
          return { ...p, stock: next };
        });
      });
    };
    window.addEventListener("inventory:decreased", onInv);
    return () => window.removeEventListener("inventory:decreased", onInv);
  }, []);

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? [...products] : [];

    if (slug) {
      const s = norm(slug);
      if (s === "akciok") {
        list = list.filter((p) => p?.sale?.active);
      } else {
        list = list.filter((p) => {
          const name = norm(p.name);
          const category = norm(p.category);
          return category === s || category.includes(s) || name.includes(s);
        });
      }
    }
    if (q) {
      const qq = norm(q);
      list = list.filter((p) => {
        const name = norm(p.name);
        const category = norm(p.category);
        return name.includes(qq) || category.includes(qq);
      });
    }

    const minV = Number(min || qMin);
    const maxV = Number(max || qMax);
    if (!Number.isNaN(minV) && String(minV) === String(min || qMin) && (min || qMin) !== "") {
      list = list.filter((p) => Number(p?.effectivePrice ?? p?.price) >= minV);
    }
    if (!Number.isNaN(maxV) && String(maxV) === String(max || qMax) && (max || qMax) !== "") {
      list = list.filter((p) => Number(p?.effectivePrice ?? p?.price) <= maxV);
    }

    if (qBrand) {
      const b = norm(qBrand);
      list = list.filter((p) => norm(p.brand) === b);
    }

    const stockOn = (onlyInStock ?? qStock) === true;
    if (stockOn) list = list.filter((p) => Number(p?.stock) > 0);

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => (Number(a.effectivePrice ?? a.price) || 0) - (Number(b.effectivePrice ?? b.price) || 0));
        break;
      case "price-desc":
        list.sort((a, b) => (Number(b.effectivePrice ?? b.price) || 0) - (Number(a.effectivePrice ?? a.price) || 0));
        break;
      case "name-asc":
        list.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
        break;
      case "name-desc":
        list.sort((a, b) => norm(b.name).localeCompare(norm(a.name)));
        break;
      case "newest":
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default:
        break;
    }
    return list;
  }, [products, slug, q, qBrand, sort, min, max, onlyInStock, qMin, qMax, qStock]);

  useEffect(() => {
    measureGridWidth();
    const ro = new ResizeObserver(() => measureGridWidth());
    const gridEl = document.querySelector(".product-grid");
    if (gridEl) ro.observe(gridEl as Element);

    const onResize = () => measureGridWidth();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [filteredProducts.length, measureGridWidth]);

  const handleAddToCart = useCallback((id: string, size?: string) => {
    const p: any = filteredProducts.find((x: any) => String(x._id) === String(id));
    if (!p) return;

    const hasVariants = Array.isArray(p?.variants) && p.variants.length > 0;
    if (hasVariants && !size) return;

    const available = Number(p?.stock ?? 0);
    if (!available || available <= 0) {
      toast("This product is out of stock.");
      return;
    }
    addToCart(size ? { ...p, size } : p, 1);
    toast(`Added ${p.name}${size ? " – " + size : ""}`);
  }, [filteredProducts, addToCart]);

  const scrollToProducts = () => {
    const anchor = productsAnchorRef.current;
    if (!anchor) return;

    // 1) header height
    const header = document.querySelector("header") as HTMLElement | null;
    const hdr = header?.offsetHeight ?? 56;

    // 2) which element is scrolling? (window or layout/main container)
    const candidates: (Element | null | undefined)[] = [
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector(".layout-main"),
      document.querySelector(".layout"),
    ];
    const scroller = candidates.find(
      (el): el is HTMLElement => !!el && (el.scrollHeight > el.clientHeight)
    ) as HTMLElement | null;

    // 3) target position in the coordinate system of the scrolling element
    const rect = anchor.getBoundingClientRect();
    const current = scroller
      ? scroller.scrollTop
      : window.scrollY || document.documentElement.scrollTop || 0;

    const target = Math.max(0, current + rect.top - hdr - 8);

    // 4) scroll to the appropriate element
    if (scroller && "scrollTo" in scroller) {
      scroller.scrollTo({ top: target, behavior: "smooth" });
    } else {
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  };

  const handleToggleWishlist = useCallback((id: string) => {
    const p: any = filteredProducts.find((x: any) => String(x._id) === String(id));
    if (!p) return;
    toggle(String(p._id));
  }, [filteredProducts, toggle]);

  const cardProducts = useMemo(() => {
    return filteredProducts.map((p: any) => {
      const img =
        resolveImg?.(p) ||
        (Array.isArray(p?.images) && p.images[0]) ||
        (candidatesFor ? candidatesFor(p, 1)[0] : null) ||
        "/placeholder.svg";

      const price = Number(p?.effectivePrice ?? p?.price ?? 0);
      const originalPrice =
        p?.sale?.active && p?.price && price < Number(p.price) ? Number(p.price) : undefined;

      const isNew =
        p?.createdAt ? (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24) < 30 : false;

      const rating =
        typeof p?.ratingAvg === "number"
          ? Math.max(0, Math.min(5, Math.round(p.ratingAvg)))
          : 0;

      const sizes = Array.isArray(p?.variants)
        ? p.variants
          .filter((v: any) => v?.size && Number(v?.stock ?? 0) > 0)
          .map((v: any) => String(v.size))
        : [];

      return {
        id: String(p._id),
        name: p.name,
        price,
        originalPrice,
        image: img,
        rating,
        isNew,
        onSale: Boolean(p?.sale?.active),
        sizes,
      };
    });
  }, [filteredProducts]);

  const wishlistIds = useMemo(
    () => filteredProducts.filter((p: any) => has(p?._id)).map((p: any) => String(p._id)),
    [filteredProducts, has]
  );

  return (
    <>
      <div className="hero-row">
        <HeroSlider onCtaClick={scrollToProducts} />
      </div>

      <div ref={productsAnchorRef} />

      <div className="container">
        {/* FilterBar: search + button at the top; drop-down panel below */}
        <FilterBar
          sortBy={sort || "featured"}
          onSortChange={(v) => setSort(v)}
          totalProducts={filteredProducts.length}
          search={search}
          setSearch={setSearch}
          min={min}
          setMin={setMin}
          max={max}
          setMax={setMax}
          updateQuery={updateQuery}
          mobileFilterOpen={mobileFilterOpen}
          setMobileFilterOpen={setMobileFilterOpen}
          widthPx={gridWidth ?? undefined}
          noSidePadding={Boolean(gridWidth)}
        />

        {loading && <p>Loading…</p>}
        {!loading && error && <p style={{ color: "crimson" }}>{error}</p>}
        {!loading && !error && (
          <ProductGrid
            products={cardProducts}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistIds={wishlistIds}
          />
        )}
      </div>
    </>
  );
}