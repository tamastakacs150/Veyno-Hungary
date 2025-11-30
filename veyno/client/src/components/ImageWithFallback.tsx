//client/src/components/ImageWithFallback.tsx
import React from "react";
import Skeleton from "./ui/skeleton";


export default function ImageWithFallback({ src, alt, className = "object-cover" }: { src: string; alt: string; className?: string }) {
const [loaded, setLoaded] = React.useState(false);
const [error, setError] = React.useState(false);


return (
<div className="relative">
{!loaded && !error && (
<div className="absolute inset-0 grid place-items-center">
<Skeleton className="h-full w-full" />
</div>
)}
{!error ? (
<img
src={src}
alt={alt}
className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
onLoad={() => setLoaded(true)}
onError={() => setError(true)}
/>
) : (
<div className="aspect-video grid place-items-center text-sm opacity-70">Image not found</div>
)}
</div>
);
}