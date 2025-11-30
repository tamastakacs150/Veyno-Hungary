//client/src/components/HeroSlider.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
}

const slides: Slide[] = [
  { image: "/slider/1.webp", title: "Old Money - The Essence of Italian Sprezzatura", subtitle: "Discover our latest Old Money collection", cta: "Shop Now" },
  { image: "/slider/2.webp", title: "Become a Fashion Icon", subtitle: "Explore our newest arrivals", cta: "Discover" },
  { image: "/slider/3.webp", title: "Dress Like a Billionaire", subtitle: "Timeless elegance for the modern era", cta: "Explore" },
];

type Dir = "next" | "prev";

type HeroSliderProps = { onCtaClick?: () => void };

export default function HeroSlider({ onCtaClick }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<Dir>("next");
  const [loaded, setLoaded] = useState<boolean[]>(() => slides.map((_, i) => i === 0));
  const timerRef = useRef<number | null>(null);

  // Preload images
  useEffect(() => {
    slides.forEach((s, idx) => {
      const img = new Image();
      img.src = s.image;
      (img as any).decoding = "async";
      img.decode?.().catch(() => {}).finally(() => {
        setLoaded(p => (p[idx] ? p : Object.assign([...p], { [idx]: true })));
      });
    });
  }, []);

  // Autoplay
  useEffect(() => {
    const tick = () => goNext();
    timerRef.current = window.setInterval(tick, 14000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, loaded]);

  const goTo = (idx: number) => {
    if (idx === current) return;
    const goingNext =
      (idx > current && !(current === 0 && idx === slides.length - 1)) ||
      (current === slides.length - 1 && idx === 0);
    setDir(goingNext ? "next" : "prev");
    setPrev(current);
    setCurrent(idx);
  };

  const goPrev = () => {
    const idx = (current - 1 + slides.length) % slides.length;
    setDir("prev");
    setPrev(current);
    setCurrent(idx);
  };

  const goNext = () => {
    const idx = (current + 1) % slides.length;
    setDir("next");
    setPrev(current);
    setCurrent(idx);
  };

  return (
    <div className="hero-row">
      {/* full-bleed wrapper – Home.css takes care of the full width */}
      <div className="hero-slider hero-slider-3d relative h-[500px] md:h-[600px] lg:h-[700px] w-full overflow-hidden bg-muted">
        {slides.map((s, i) => {
          const isActive = i === current;
          const isPrev   = i === prev;

          // until the active image has loaded, show prev (no white flash)
          const showPrevLayer = isPrev && !loaded[current];
          const showActive    = isActive && loaded[i];

          // state classes for animation
          const stateClass =
            isActive
              ? (dir === "next" ? "enter-from-right" : "enter-from-left")
              : isPrev
                ? (dir === "next" ? "exit-to-left" : "exit-to-right")
                : "hidden-slide";

          return (
            <div
              key={i}
              className={`hero-slide ${stateClass}`}
              aria-hidden={!isActive}
              style={{ pointerEvents: isActive ? "auto" : "none" }}
            >
              {/* image – real <img> with object-cover to make the render stable */}
              <img
                src={s.image}
                alt={s.title}
                className="hero-img absolute inset-0 w-full h-full object-cover"
                {...(i === 0
                  ? { loading: "eager", fetchPriority: "high", decoding: "async" as const }
                  : { loading: "lazy", decoding: "async" as const })}
                onLoad={() => setLoaded(p => (p[i] ? p : Object.assign([...p], { [i]: true })))}
                style={{
                  opacity: showActive || showPrevLayer ? 1 : 0,
                }}
              />

              {/* darkening overlay – cannot receive pointers */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />

              {/* content */}
              <div className="relative h-full flex items-center justify-center text-center px-4">
                <div className="max-w-4xl space-y-6 relative z-20">
                  <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
                    {s.title}
                  </h2>
                  <p className="text-lg md:text-xl lg:text-2xl text-white/90 drop-shadow-md">
                    {s.subtitle}
                  </p>
                  <Button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    size="lg"
                    className="
                      relative z-30 cursor-pointer
                      bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg
                      ring-0 focus:ring-0 focus-visible:ring-0 outline-none
                      active:translate-y-0 active:scale-100 focus:scale-100
                    "
                    onClick={onCtaClick}
                  >
                    {s.cta}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
          {/* paging arrows – same style as in Product images */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={goPrev}
            className="hero-nav prev"
            aria-label="Previous slide"
          >
            <ChevronLeft />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={goNext}
            className="hero-nav next"
            aria-label="Next slide"
          >
            <ChevronRight />
          </button>
      </div>
    </div>
  );
}
