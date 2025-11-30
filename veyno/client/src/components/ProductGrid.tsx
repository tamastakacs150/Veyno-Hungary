//client/src/components/ProductGrid.tsx
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  isNew?: boolean;
  onSale?: boolean;
  sizes?: string[];
}

interface ProductGridProps {
  products: Product[];
  onAddToCart?: (id: string, size?: string) => void;
  onToggleWishlist?: (id: string) => void;
  wishlistIds?: string[];
}

export default function ProductGrid({
  products,
  onAddToCart,
  onToggleWishlist,
  wishlistIds = [],
}: ProductGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={`product-grid grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 seq-mode ${
        visible ? "animate-in-view" : ""
      }`}
    >
      {products.map((product, i) => (
        <div
          key={product.id}
          className="product-card footer-anim-item rounded-2xl"
          style={{ ["--i" as any]: i }}
        >
          <ProductCard
            {...product}
            onAddToCart={(size?: string) => onAddToCart?.(product.id, size)}
            onToggleWishlist={() => onToggleWishlist?.(product.id)}
            isInWishlist={wishlistIds.includes(product.id)}
          />
        </div>
      ))}
    </div>
  );
}
