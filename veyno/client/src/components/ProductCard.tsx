//client/src/components/ProductCard.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartIcon, CartIcon, StarIcon } from "@/icons/icons";
import { useCurrency } from "@/context/CurrencyContext";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  isNew?: boolean;
  onSale?: boolean;
  sizes?: string[];                // S, M, L, XL...
  onAddToCart?: (size?: string) => void; // size optional
  onToggleWishlist?: () => void;
  isInWishlist?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  rating = 0,
  isNew = false,
  onSale = false,
  sizes = [],
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();
  const { format } = useCurrency();

  const hasVariants = Array.isArray(sizes) && sizes.length > 0;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist?.();
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      setOpen((v) => !v);
    } else {
      onAddToCart?.();
    }
  };

  const handlePickSize = (size: string) => {
    onAddToCart?.(size);
    setOpen(false);
  };

  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border-0 shadow-elegant hover:shadow-elegant-hover transition-all duration-300 ${open ? "z-40" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setOpen(false);
      }}
    >
      {/* Image – CLICK → PRODUCT PAGE */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-muted cursor-pointer rounded-t-2xl"
        onClick={() => nav(`/product/${id}`)}
        role="button"
        aria-label={`${name} zoom in`}
        style={{ borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") nav(`/product/${id}`);
        }}
      >
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-accent text-accent-foreground font-semibold">NEW</Badge>
          )}
          {onSale && originalPrice && (
            <Badge variant="destructive" className="font-semibold">SALE</Badge>
          )}
        </div>

        {/* Wishlist */}
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 h-10 w-10 rounded-full backdrop-blur-sm transition-all border
            ${isInWishlist
              ? "bg-rose-50 hover:bg-rose-100 border-rose-200" // favorite: hover a little DARKER (rose-100)
              : "bg-white/90 hover:bg-white border-transparent" // not liked: remains white
            }
            ${isHovered ? "opacity-100" : "opacity-0"}`}
          onClick={handleWishlistToggle}
          aria-pressed={isInWishlist}
          aria-label="Favourites"
          title={isInWishlist ? "Remove from favourites" : "Add to favourites"}
        >
          <HeartIcon
            filled={isInWishlist}
            className={isInWishlist ? "text-rose-600" : "text-foreground"}
            size={30}
          />
        </Button>
        
        {/* Action bar (hover) */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 overflow-visible ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-visible" ref={dropdownRef}>
            {/* Size dropdown (Add to cart above/below, only if there are variants) */}
            {hasVariants && (
              <div
                className={`absolute left-0 right-0 bottom-full rounded-md border bg-white shadow-lg transition-all duration-200 ease-out origin-bottom ${
                  open 
                    ? "opacity-100 scale-100 translate-y-0" 
                    : "opacity-0 scale-95 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="grid grid-cols-4 gap-2 p-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      className="border rounded-md w-full px-4 py-2 text-sm font-semibold hover:bg-muted hover:border-primary transition-colors flex items-center justify-center"
                      style={{ height: "40px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePickSize(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={handleAddToCartClick}
            >
              <CartIcon className="mr-2 h-4 w-4" />
              Add to cart
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm md:text-base line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>

        {rating > 0 && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`h-3 w-3 ${i < rating ? "fill-accent text-accent" : "fill-muted text-muted"}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">({rating}.0)</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">
            {format(price)}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-muted-foreground line-through">
              {format(originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
