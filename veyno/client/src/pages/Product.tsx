// client/src/pages/Product.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import { useCart } from "@/context/CartContext";
import "../styles/Product.css";
import resolveImg, { folderFromProduct, slugify } from "../utils/resolveImg.js";
import Stars from "../components/Stars";
import { SearchIcon, HeartIcon} from "../icons/icons";
import useWishlist from "../hooks/useWishlist";
import { toast } from "../utils/toast.js";
import { useCurrency } from "@/context/CurrencyContext";
import ProductZoom from "../components/ProductZoom";
import DOMPurify from "dompurify";

const API_URL = import.meta.env?.VITE_API_URL || "";
const eff = (p: any) => Number(p?.effectivePrice ?? p?.price ?? 0);

// accent normalizer for lowercase comparison
const norm = (s) =>
  (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Product() {
  const { id } = useParams(); // /product/:id
  const nav = useNavigate();
  const { addToCart } = useCart();
  const { format } = useCurrency();
  const { has, toggle } = useWishlist();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState([]);
  const [size, setSize] = useState("");
  const [hCm, setHCm] = useState("");
  const [wKg, setWKg] = useState("");
  const [fitPref, setFitPref] = useState("normal");
  const [showSizeReco, setShowSizeReco] = useState(false);
  const sizeRecoRef = useRef(null);
  const selectedVariant = product?.variants?.find((v) => v.size === size);
  const available = selectedVariant ? Number(selectedVariant?.stock ?? 0) : Number(product?.stock ?? 0);
  const out = available <= 0;

  // --- Loading product
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setProduct(null);
    setGalleryIdx(0);

    (async () => {
      try {
        let item = null;
        try {
          const r = await api.get(`/products/${encodeURIComponent(id)}`);
          if (!Array.isArray(r.data) && r.data && typeof r.data === "object") {
            item = r.data;
          }
        } catch {
          /* fallback below */
        }

        if (!item) {
          const all = await api.get(`/products`);
          const list = Array.isArray(all.data) ? all.data : [];
          item =
            list.find((p) => String(p._id) === String(id)) ||
            list.find((p) => norm(p.slug || p.name) === norm(id)) ||
            null;
        }

        if (!alive) return;
        if (!item) {
          setError("The product does not exist");
        } else {
          setProduct(item);
          document.title = `${item.name} – VEYNO Hungary`;
        }
      } catch {
        if (!alive) return;
        setError("An error occurred while loading the product.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  // sync with context when product arrives
  useEffect(() => {
    if (product?._id) setIsFav(has(String(product._id)));
  }, [product?._id, has]);

  const toggleFav = () => {
    if (!product?._id) return;
    toggle(String(product._id));
    setIsFav((v) => !v);
  };

  // --- Related products (same category prior, random order)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!product) {
          setRelated([]);
          return;
        }
        const r = await api.get(`/products`);
        if (!alive) return;

        const all = Array.isArray(r.data) ? r.data : [];
        const cat = (product.category || "").toString();

        const sameCat = all.filter((x) => String(x._id) !== String(product._id) && (x.category || "") === cat);
        const others = all.filter((x) => String(x._id) !== String(product._id) && (x.category || "") !== cat);

        function shuffle(arr) {
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        }

        const TAKE = 5;
        const takeSame = Math.min(3, sameCat.length, TAKE);
        const takeOther = Math.max(0, TAKE - takeSame);

        let picks = [...shuffle(sameCat).slice(0, takeSame), ...shuffle(others).slice(0, takeOther)];
        picks = shuffle(picks);
        setRelated(picks);
      } catch {
        if (!alive) return;
        setRelated([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product?._id, product?.category, API_URL]);

  // --- ONLY category based folder
  const folder = useMemo(() => folderFromProduct(product || {}), [product]);

  // --- Gallery: images from category folder (1..3 fallback)
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (!product) {
      setImages([]);
      return;
    }

    const idxs = [1, 2, 3];

    function pickFirstExisting(urls) {
      return new Promise((resolve, reject) => {
        let i = 0;
        let done = false;
        const tryNext = () => {
          if (done) return;
          if (i >= urls.length) {
            reject(new Error("no candidate"));
            return;
          }
          const u = urls[i++];
          const img = new Image();
          img.onload = () => {
            if (!done) {
              done = true;
              resolve(u);
            }
          };
          img.onerror = () => tryNext();
          img.src = u;
        };
        tryNext();
      });
    }

    let cancelled = false;
    (async () => {
      const found = [];
      for (const i of idxs) {
        const candidates = [
          `/api/products/${folder}/${i}.webp`,
          `/api/products/${folder}/${i}.jpg`,
          `/api/products/${folder}/${i}.jpeg`,
          `/api/products/${folder}/${i}.png`,
        ];
        try {
          const url = await pickFirstExisting(candidates);
          if (!cancelled) found.push(url);
        } catch {
          /* no image for this index – we skip it */
        }
      }
      if (!cancelled) setImages(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [product, folder]);

  // inventory change monitoring
  useEffect(() => {
    const onInv = (e) => {
      const changes = Array.isArray(e?.detail) ? e.detail : [];
      if (!changes.length || !product?._id) return;
      const hit = changes.find((c) => String(c.productId) === String(product._id));
      if (!hit) return;
      const newStock = Math.max(0, Number(product.stock || 0) - Number(hit.quantity || 0));
      setProduct((prev) => (prev ? { ...prev, stock: newStock } : prev));
    };

    window.addEventListener("inventory:decreased", onInv);
    return () => window.removeEventListener("inventory:decreased", onInv);
  }, [product?._id]);

  const inStock = Number(product?.stock ?? 0) > 0;

  const onAddToCart = useCallback(() => {
    if (!product) return;

    if (Array.isArray(product?.variants) && product.variants.length > 0 && !size) {
      toast("Choose your size (S/M/L/XL)!");
      return;
    }
    if ((available | 0) <= 0) {
      toast("This product is out of stock.");
      return;
    }
    if ((qty | 0) > (available | 0)) {
      toast(`Maximum available: ${available} pcs.`);
      setQty(available | 0);
      return;
    }

    const item = {
      ...product,
      price: eff(product),
      size,
    };

    addToCart(item, Math.max(1, qty | 0));
    toast(`Added ${product.name}${size ? " – " + size : ""}`);
  }, [product, qty, size, addToCart, available]);

  // SEO JSON-LD
  const jsonLd = useMemo(() => {
    if (!product) return null;
    const price = Math.round(Number(product.price || 0));
    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.name,
      image: images,
      description: product.description || product.shortDescription || "",
      sku: product.sku || product._id,
      brand: product.brand || "Brand",
      offers: {
        "@type": "Offer",
        priceCurrency: "HUF",
        price: price,
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    };
  }, [product, images, inStock]);

  // Recommended size
  const suggested = useMemo(() => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length === 0) return "";

    const height = Number(hCm);
    const weight = Number(wKg);
    if (!height || !weight) return "";

    const bmi = weight / Math.pow(height / 100, 2);

    const baseIndexFrom = (h, b) => {
      let i = 2; // baseline = M
      if (h < 158 || b < 17) i = 0;              // XS
      else if (h < 165 || b < 19) i = 1;         // S
      else if (h >= 195 || b >= 32) i = 5;       // XXL
      else if (h >= 188 || b >= 28) i = 4;       // XL
      else if (h >= 180 || b >= 25) i = 3;       // L
      return i;
    };

    let idx = baseIndexFrom(height, bmi);
    if (fitPref === "slim") idx -= 1;
    if (fitPref === "loose") idx += 1;

    const KNOWN = ["XS", "S", "M", "L", "XL"];
    const normSize = (s) => String(s || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace("-", "");

    const byStock = (v) => Number(v?.stock ?? 0) > 0;

    const sizesOriginal = variants.map(v => String(v.size));
    const sizesNorm = sizesOriginal.map(normSize);

    const presentSet = new Set(sizesNorm);
    const orderedKnown = KNOWN.filter(k => presentSet.has(k));

    const unknown = variants
      .map(v => String(v.size))
      .filter(s => !KNOWN.includes(normSize(s)));
    const unknownSorted = [...new Set(unknown)].sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    const orderedAllNorm = [...orderedKnown, ...unknownSorted.map(normSize)];
    if (orderedAllNorm.length === 0) return "";

    const clampIdx = (v, a, b) => Math.max(a, Math.min(b, v));
    const targetIdx = clampIdx(idx, 0, orderedAllNorm.length - 1);
    const labelNormAt = (i) => orderedAllNorm[clampIdx(i, 0, orderedAllNorm.length - 1)];
    const firstVariantByNorm = (n) => variants.find(v => normSize(v.size) === n);

    let chosen = firstVariantByNorm(labelNormAt(targetIdx));
    if (!chosen || !byStock(chosen)) {
      let best = null, bestDist = 1e9;
      for (let i = 0; i < orderedAllNorm.length; i++) {
        const v = firstVariantByNorm(orderedAllNorm[i]);
        if (v && byStock(v)) {
          const d = Math.abs(i - targetIdx);
          if (d < bestDist) { best = v; bestDist = d; }
        }
      }
      chosen = best || firstVariantByNorm(labelNormAt(targetIdx));
    }
    return chosen?.size || "";
  }, [product?.variants, hCm, wKg, fitPref]);

  if (loading) {
    return (
      <div className="pdp-wrap luxe">
        <div className="skeleton pdp-grid">
          <div className="skeleton-img" />
          <div className="skeleton-info">
            <div className="sk-line w60" />
            <div className="sk-line w40" />
            <div className="sk-line w80" />
            <div className="sk-line w50" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pdp-wrap luxe">
        <p style={{ color: "crimson" }}>{error || "No product found."}</p>
        <button className="btn" onClick={() => nav(-1)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="pdp-wrap luxe">
      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      {/* Crumb */}
      <div className="breadcrumb upper">
        <Link to="/">Home</Link>
        {product.category && (
          <>
            <span>·</span>
            <Link to={`/category/${slugify(product.category)}`}>{product.category}</Link>
          </>
        )}
        <span>·</span>
        <span className="muted">{product.name}</span>
      </div>

      <div className="pdp-grid">
        {/* Gallery */}
        <div className="gallery">
          {images.length > 0 ? (
            <>
              <div className="main-img">
                <img
                  src={images[galleryIdx]}
                  alt={product.name}
                  onError={(e) => {
                    const idx = galleryIdx + 1;
                    const list = [
                      `/api/products/${folder}/${idx}.webp`,
                      `/api/products/${folder}/${idx}.jpg`,
                      `/api/products/${folder}/${idx}.jpeg`,
                      `/api/products/${folder}/${idx}.png`,
                    ];
                    const current = e.currentTarget.src;
                    const next = list.find((u) => u !== current);
                    e.currentTarget.src = next || "/placeholder.svg";
                  }}
                />

                {/* Left/Right arrows */}
                {images.length > 1 && galleryIdx > 0 && (
                  <button
                    type="button"
                    aria-label="Previous image"
                    className="nav-arrow left"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setGalleryIdx((i) => Math.max(0, i - 1));
                    }}
                  >
                    ‹
                  </button>
                )}
                {images.length > 1 && galleryIdx < images.length - 1 && (
                  <button
                    type="button"
                    aria-label="Next image"
                    className="nav-arrow right"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setGalleryIdx((i) => Math.min(images.length - 1, i + 1));
                    }}
                  >
                    ›
                  </button>
                )}

                {/* Indicator strips */}
                {images.length > 1 && (
                  <div className="indicators">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Image ${i + 1}`}
                        className={`bar ${i === galleryIdx ? "active" : ""}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setGalleryIdx(i);
                        }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="zoom-icon"
                  onClick={() => setZoomOpen(true)}
                  aria-label="Open zoom view"
                >
                  <SearchIcon name="search" size={24} strokeWidth={2} />
                </button>
              </div>

              {images.length > 1 && (
                <div className="thumbs">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      className={`thumb ${i === galleryIdx ? "active" : "inactive"}`}
                      onClick={() => setGalleryIdx(i)}
                      aria-label={`Image ${i + 1}`}
                      type="button"
                    >
                      <img
                        src={src}
                        alt={`${product.name} ${i + 1}`}
                        onError={(e) => {
                          const list = [
                            `/api/products/${folder}/${i + 1}.webp`,
                            `/api/products/${folder}/${i + 1}.jpg`,
                            `/api/products/${folder}/${i + 1}.jpeg`,
                            `/api/products/${folder}/${i + 1}.png`,
                          ];
                          const current = e.currentTarget.src;
                          const next = list.find((u) => u !== current);
                          e.currentTarget.src = next || "/placeholder.svg";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="noimg">No image</div>
          )}
        </div>

        {/* Right column – details */}
        <div className="details sticky">
          <div className="title-wrap">
            <div className="fav-top">
              <button
                onClick={toggleFav}
                className={`wish-btn ${isFav ? "active" : ""}`}
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <HeartIcon filled={isFav} />
              </button>
            </div>
            <h1 className="title serif">{product.name}</h1>
          </div>

          <Stars value={product?.ratingAvg} count={product?.ratingCount} />

          <div className="price-row">
            <div className="price">
              {product?.discountPercent > 0 ? (
                <>
                  <span className="old">{format(product.price)}</span>
                  <span className="now">{format(eff(product))}</span>
                </>
              ) : (
                <span className="now">{format(product.price)}</span>
              )}
            </div>
            <div className={`stock ${inStock ? "in" : "out"}`}>
              {inStock ? "In stock" : "Out of stock"}
            </div>
          </div>

          {!!product.shortDescription && <p className="shortdesc">{product.shortDescription}</p>}
          {!product.shortDescription && !!product.description && (
            <p className="shortdesc">
              {String(product.description).slice(0, 220)}
              {String(product.description).length > 220 ? "…" : ""}
            </p>
          )}

          {Array.isArray(product?.variants) && product.variants.length > 0 && (
            <div className="size-block">
              <div className="size-head">
                <p>Size</p>
                <button
                  type="button"
                  className="size-guide"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("pdp:open-size-reco"));
                  }}
                >
                  Size guide
                </button>
              </div>
              <div className="sizes">
                {product.variants.map((v) => {
                  const s = v.size;
                  const disabled = Number(v.stock || 0) <= 0;
                  const isActive = size === s;
                  const isSuggested = suggested && s === suggested && !isActive;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => !disabled && setSize(s)}
                      disabled={disabled}
                      className={[
                        "size-btn",
                        isActive ? "is-active" : "",
                        isSuggested ? "is-suggested" : "",
                      ].join(" ")}
                      title={disabled ? "Sold out" : isSuggested ? "Recommended size" : s}
                    >
                      {s}
                      {isSuggested ? " ★" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size recommendation panel */}
          {showSizeReco && (
            <div className="size-reco" ref={sizeRecoRef}>
              <div className="size-reco-head">Size guide (height + weight + style)</div>
              <div className="size-reco-row">
                <input
                  type="number"
                  min={120}
                  max={220}
                  placeholder="cm"
                  value={hCm}
                  onChange={(e) => setHCm(e.target.value)}
                  className="f-input"
                />
                <input
                  type="number"
                  min={35}
                  max={180}
                  placeholder="kg"
                  value={wKg}
                  onChange={(e) => setWKg(e.target.value)}
                  className="f-input"
                />
                <select
                  value={fitPref}
                  onChange={(e) => setFitPref(e.target.value)}
                  className="f-input"
                >
                  <option value="slim">Slim</option>
                  <option value="normal">Normal</option>
                  <option value="loose">Loose</option>
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={() => suggested && setSize(suggested)}
                  disabled={!suggested}
                  title={suggested ? `Recommended: ${suggested}` : "Enter your height and weight."}
                >
                  Apply {suggested ? `(${suggested})` : ""}
                </button>
              </div>
              {suggested && (
                <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
                  Recommended size: <b>{suggested}</b>
                </div>
              )}
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="buy-row">
            <button className="btn primary atc" disabled={out} onClick={onAddToCart}>
              Add to cart
            </button>

            {out && (
              <div className="small" style={{ color: "crimson", marginTop: "4px" }}>
                This size is out of stock
              </div>
            )}
          </div>

          <Accordion
            product={product}
            sizeReco={{
              hCm,
              setHCm,
              wKg,
              setWKg,
              fitPref,
              setFitPref,
              suggested,
              setSize,
            }}
          />
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="related">
          <div className="rel-bar">
            <h2 className="rel-head serif">Recommended products</h2>
            <Link to="/" className="rel-viewall">
              SEE ALL
            </Link>
          </div>

          <div className="rel-grid">
            {related.map((p) => (
              <Link
                to={`/product/${encodeURIComponent(p._id)}`}
                key={p._id}
                className="rel-card"
                title={p.name}
              >
                <div className="rel-imgwrap">
                  <img
                    src={resolveImg(p)}
                    alt={p.name}
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <p className="rel-name upper">{p.name}</p>
                <p className="rel-price">
                  {p?.discountPercent > 0 ? (
                    <>
                      <span className="old">{format(p.price)}</span>
                      <span className="now">{format(eff(p))}</span>
                    </>
                  ) : (
                    format(p.price)
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Image magnifier overlay */}
      {zoomOpen && images.length > 0 && (
        <ProductZoom
          images={images}
          initialIndex={galleryIdx}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

// Simple HTML filter
function safeHtml(html: unknown) {
  const dirty = String(html ?? "");

  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });
}

/* ---- Accordion and NiceSelect unchanged at the bottom ---- */
function AccordionItem({ title, open, onToggle, children }) {
  return (
    <div className={`acc-item ${open ? "open" : ""}`}>
      <button className="acc-toggle" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="acc-title">{title}</span>
        <span className="acc-icon" aria-hidden>{open ? "×" : "+"}</span>
      </button>

      {/* Always in the DOM: the .open class triggers the transition */}
      <div className="acc-panel" aria-hidden={!open}>
        <div className="acc-inner">{children}</div>
      </div>
    </div>
  );
}

function Accordion({ product, sizeReco }) {
  const [open, setOpen] = useState({ size: false, a: false, b: false, c: false });

  useEffect(() => {
    const onOpen = () => setOpen((s) => ({ ...s, size: true }));
    window.addEventListener("pdp:open-size-reco", onOpen);
    return () => window.removeEventListener("pdp:open-size-reco", onOpen);
  }, []);

  return (
    <div className="acc-wrap">
      <AccordionItem
        title="SIZE RECOMMENDATION"
        open={open.size}
        onToggle={() => setOpen((s) => ({ ...s, size: !s.size }))}
      >
        <div className="size-reco compact">
          <div className="size-reco-row">
            <input
              type="number"
              min={120}
              max={220}
              placeholder="cm"
              value={sizeReco?.hCm || ""}
              onChange={(e) => sizeReco?.setHCm?.(e.target.value)}
              className="f-input"
            />
            <input
              type="number"
              min={35}
              max={180}
              placeholder="kg"
              value={sizeReco?.wKg || ""}
              onChange={(e) => sizeReco?.setWKg?.(e.target.value)}
              className="f-input"
            />
            <NiceSelect
              value={sizeReco?.fitPref || "normal"}
              onChange={(v) => sizeReco?.setFitPref?.(v)}
              options={[
                { value: "slim", label: "Slim" },
                { value: "normal", label: "Normal" },
                { value: "loose", label: "Loose" },
              ]}
            />
            <button
              type="button"
              className="btn dark"
              onClick={() => sizeReco?.suggested && sizeReco?.setSize?.(sizeReco.suggested)}
              disabled={!sizeReco?.suggested}
              title={
                sizeReco?.suggested ? `Recommended: ${sizeReco.suggested}` : "Enter your height and weight"
              }
            >
              Apply{sizeReco?.suggested ? ` (${sizeReco.suggested})` : ""}
            </button>
          </div>

          {sizeReco?.suggested && (
            <div className="small hint">
              Recommended size: <b>{sizeReco.suggested}</b>
            </div>
          )}
        </div>
      </AccordionItem>

      <AccordionItem
        title="PRODUCT DETAILS"
        open={open.a}
        onToggle={() => setOpen((s) => ({ ...s, a: !s.a }))}
      >
        {product?.description ? (
          <div className="desc" dangerouslySetInnerHTML={{ __html: safeHtml(product.description) }} />
        ) : (
          <ul className="acc-list">
            {product?.specs
              ? Object.entries(product.specs).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}:</b> {String(v)}
                  </li>
                ))
              : <li>No detailed description.</li>}
          </ul>
        )}
      </AccordionItem>

      <AccordionItem
        title="SHIPPING & RETURNS"
        open={open.b}
        onToggle={() => setOpen((s) => ({ ...s, b: !s.b }))}
      >
        <ul className="acc-list">
          <li>Delivery: 1–3 business days by courier.</li>
          <li>14-day right of withdrawal - easy return.</li>
          <li>Free replacement in case of a defective product.</li>
        </ul>
      </AccordionItem>

      <AccordionItem
        title="INSTRUCTIONS"
        open={open.c}
        onToggle={() => setOpen((s) => ({ ...s, c: !s.c }))}
      >
        {product?.care ? (
          <div className="desc" dangerouslySetInnerHTML={{ __html: safeHtml(product.care) }} />
        ) : (
          <ul className="acc-list">
            <li>Professional cleaning is recommended.</li>
            <li>Store in a dry, cool place.</li>
            <li>Avoid direct sunlight.</li>
          </ul>
        )}
      </AccordionItem>
    </div>
  );
}

function NiceSelect({ value, onChange, options = [], className = "" }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(
    Math.max(0, options.findIndex((o) => o.value === value))
  );
  const rootRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const i = options.findIndex((o) => o.value === value);
    if (i >= 0) setActiveIdx(i);
  }, [value, options]);

  function commit(i) {
    const opt = options[i];
    if (!opt) return;
    onChange?.(opt.value);
    setOpen(false);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open ? commit(activeIdx) : setOpen(true);
    } else if (e.key === "Escape") setOpen(false);
  }

  const label =
    (options.find((o) => o.value === value) || options[0] || {}).label || "Choose…";

  return (
    <div
      ref={rootRef}
      className={`nselect ${className}`}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      tabIndex={0}
      onKeyDown={onKey}
    >
      <button type="button" className="nselect-btn" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <ul className="nselect-menu" role="listbox">
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              className={`nselect-opt ${i === activeIdx ? "active" : ""} ${
                value === o.value ? "selected" : ""
              }`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => commit(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
