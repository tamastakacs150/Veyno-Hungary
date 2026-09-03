// client/src/types/models.ts
// Shared shapes for the data the API returns. These mirror the Mongoose schemas
// in server/models/ — keep them in sync when a schema changes.

export type Role = "user" | "admin";
export type Provider = "local" | "google";
export type Size = "S" | "M" | "L" | "XL";

export interface Address {
    country?: string;
    postalCode?: string;
    city?: string;
    street?: string;
    houseNumber?: string;
    [key: string]: unknown;
}

export interface ProductVariant {
    size: Size;
    stock: number;
    sku?: string;
    priceOverride?: number | null;
}

export interface ProductSale {
    active: boolean;
    type: "percent" | "amount";
    value: number;
    startAt?: string | null;
    endAt?: string | null;
    label?: string;
}

export interface Product {
    _id: string;
    id?: string;
    sku: string;
    brand: string;
    category: string;
    name: string;
    slug: string;
    description?: string;
    price: number;
    stock?: number;
    image?: string;
    imageFolder: string;
    images?: string[];
    variants?: ProductVariant[];
    sale?: ProductSale;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

/** An item in the cart. The API sometimes returns `productId` populated as a
 *  full Product, and sometimes as a bare id string, so both are allowed. */
export interface CartItem {
    productId: string | Product;
    quantity: number;
    size?: string | null;
    name?: string;
    price?: number;
    image?: string;
    category?: string;
    /** Older local-storage entries used these; kept so guest carts still parse. */
    _id?: string;
    id?: string;
    qty?: number;
    selectedSize?: string | null;
}

export interface User {
    _id: string;
    id?: string;
    name: string;
    email: string;
    role: Role;
    provider?: Provider;
    verified?: boolean;
    phone?: string;
    googleId?: string | null;
    defaultAddress?: Address | null;
    newsletterOptIn?: boolean;
    cart?: CartItem[];
    favorites?: string[];
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface AuthResponse {
    token: string;
    user: User;
    [key: string]: unknown;
}

/** Shape of an axios error as this app reads it. */
export interface ApiError {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
    [key: string]: unknown;
}

/** A category as /categories returns it, used by the sidebar. */
export interface Category {
    slug: string;
    title: string;
    count?: number;
}
