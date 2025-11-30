//client/src/components/ScrollToTop.tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {

  const { pathname, hash } = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (hash) return;
    // Only scroll if pathname has actually changed
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const candidates: (Element | null)[] = [
      document.querySelector(".layout-main"),
      document.querySelector(".layout"),
      document.scrollingElement, // html/body
      document.documentElement,
      document.body,
    ];

    const doScroll = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
      for (const el of candidates) {
        if (!el) continue;
        if (typeof el.scrollTo === "function") {
          // @ts-ignore
          el.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } else {
          (el as HTMLElement).scrollTop = 0;
          (el as HTMLElement).scrollLeft = 0;
        }
      }
    };

    // immediately
    doScroll();
    const r1 = requestAnimationFrame(doScroll);
    const t = setTimeout(doScroll, 50);

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t);
    };
  }, [pathname, hash]);

  return null;
}
