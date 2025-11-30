// client/src/utils/resolveImg.js

export const IMAGE_EXTS = ["webp", "jpg", "jpeg", "png"];

/* Slug: no accents, lowercase, hyphens */
export function slugify(s = "") {
    return String(s)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function folderFromProduct(p = {}) {
    const direct = (p.imageFolder || p.folder || "").trim().replace(/^\/+|\/+$/g, "");
    if (direct) return direct;

    const productSlug = slugify(p.slug || p.name || p.sku || p._id || "termek");
    const cat = slugify(p.category || "egyeb");
    return `${cat}/${productSlug}`;
}

/* API base path a termékképekhez */
export const PRODUCTS_BASE = "/api/products";

export function productBase(folder = "") {
    return `${PRODUCTS_BASE}/${String(folder).replace(/^\/+|\/+$/g, "")}`;
}

/* Path to a specific index and extension (e.g. 1.webp) */
export function resolveImgWithExt(p = {}, idx = 1, ext = "jpg") {
    const n = Math.max(1, Math.min(99, Number(idx) || 1)); // 1..99
    const base = productBase(folderFromProduct(p));
    const cleanExt = String(ext).toLowerCase().replace(/^\./, "");
    return `${base}/${n}.${cleanExt}`;
}

/* List of possible image files for a given index (in fallback order) */
export function candidatesFor(p = {}, idx = 1, exts = IMAGE_EXTS) {
    return (exts || IMAGE_EXTS).map((ext) => resolveImgWithExt(p, idx, ext));
}

/* BACKWARDS compatible: main image URL – first preferred format */
export default function resolveImg(p = {}) {
    return resolveImgWithExt(p, 1, IMAGE_EXTS[0]);
}

export function resolveImgIdx(p = {}, idx = 1, ext = "jpg") {
    return resolveImgWithExt(p, idx, ext);
}
