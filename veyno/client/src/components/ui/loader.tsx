//client/src/components/ui/loader.tsx

interface LoadingAnimationProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "overlay";
}

export default function LoadingAnimation({ size = "md", variant = "default" }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  const containerClasses = variant === "overlay" 
    ? "absolute inset-0 flex items-center justify-center bg-transparent z-50"
    : "flex items-center justify-center";

  return (
    <>
      <style>{`
        @keyframes spinLoader {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseLoader {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <div className={containerClasses}>
        <div className="relative" style={{ perspective: "1000px" }}>
          {/* Ambient glow */}
          <div 
            className={`${sizeClasses[size]} rounded-full absolute inset-0`}
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
              filter: "blur(25px)",
              animation: "pulseLoader 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
          
          {/* Primary gradient arc */}
          <div 
            className={`${sizeClasses[size]} rounded-full relative`}
            style={{
              background: "conic-gradient(from 0deg, white 0deg, rgba(255,255,255,0.8) 60deg, transparent 120deg, transparent 360deg)",
              animation: "spinLoader 2s cubic-bezier(0.645, 0.045, 0.355, 1) infinite",
              maskImage: "radial-gradient(circle, transparent 45%, black 46%, black 100%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 45%, black 46%, black 100%)",
            }}
          />

          {/* Secondary gradient arc - counter rotating */}
          <div 
            className={`${sizeClasses[size]} rounded-full absolute inset-0 opacity-60`}
            style={{
              background: "conic-gradient(from 180deg, rgba(255,255,255,0.6) 0deg, transparent 90deg, transparent 360deg)",
              animation: "spinLoader 3s cubic-bezier(0.645, 0.045, 0.355, 1) infinite reverse",
              maskImage: "radial-gradient(circle, transparent 45%, black 46%, black 100%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 45%, black 46%, black 100%)",
            }}
          />
        </div>
      </div>
    </>
  );
}
