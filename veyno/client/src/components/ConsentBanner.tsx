//client/src/components/ConsentBanner.tsx
import { useState, useEffect } from "react";
import "../styles/ConsentBanner.css";

export default function ConsentBanner() {
  const [accepted, setAccepted] = useState(
    localStorage.getItem("cookiesAccepted") === "true"
  );

  useEffect(() => {
    if (accepted) localStorage.setItem("cookiesAccepted", "true");
  }, [accepted]);

  if (accepted) return null;

  return (
    <div className="consent-banner">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      
      {/* Ambient glow effect */}
      <div className="absolute -top-20 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm sm:text-base leading-relaxed">
          This site uses cookies to improve your experience.
        </p>
        <button
          onClick={() => setAccepted(true)}
          className="consent-button whitespace-nowrap"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
