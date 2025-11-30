//client/src/components/ui/skeleton.tsx
import React from "react";


export default function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
return <div className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}