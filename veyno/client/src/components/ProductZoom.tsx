// client/src/components/ProductZoom.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductZoomProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ProductZoom({ images, initialIndex = 0, onClose }: ProductZoomProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.5;

  // Reset on image change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
  }, [currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, scale]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - SCALE_STEP, MIN_SCALE);
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 h-12 w-12 rounded-full bg-white hover:bg-white/90 text-foreground border-0 transition-all duration-300 shadow-lg"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Zoom controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          disabled={scale >= MAX_SCALE}
          className="h-12 w-12 rounded-full bg-white hover:bg-white/90 text-foreground border-0 transition-all duration-300 disabled:opacity-40 shadow-lg"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          disabled={scale <= MIN_SCALE}
          className="h-12 w-12 rounded-full bg-white hover:bg-white/90 text-foreground border-0 transition-all duration-300 disabled:opacity-40 shadow-lg"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          disabled={scale === MIN_SCALE}
          className="h-12 w-12 rounded-full bg-white hover:bg-white/90 text-foreground border-0 transition-all duration-300 disabled:opacity-40 shadow-lg"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white text-foreground text-sm font-medium shadow-lg">
        {Math.round(scale * 100)}%
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-40 h-14 w-14 rounded-full bg-white hover:bg-white/90 text-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
          >
            <span className="text-2xl">‹</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-40 h-14 w-14 rounded-full bg-white hover:bg-white/90 text-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
          >
            <span className="text-2xl">›</span>
          </button>
        </>
      )}

      {/* Main image container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center p-20"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Product view ${currentIndex + 1}`}
          className={`max-w-full max-h-full object-contain select-none transition-all duration-300 ${
            scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: "center center",
          }}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          onClick={() => {
            if (scale === MIN_SCALE) {
              zoomIn();
            }
          }}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 p-3 rounded-2xl bg-white shadow-lg">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`relative h-16 w-16 rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                idx === currentIndex
                  ? "border-foreground scale-110"
                  : "border-border hover:border-foreground/60 hover:scale-105"
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
