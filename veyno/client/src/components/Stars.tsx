//client/src/components/Stars.tsx
import { useMemo, useRef } from "react";
import { StarIcon } from "../icons/icons";

export default function Stars({ value, count, size = 20, seed }) {
    // Stable “random” seed for each instance (if not specified externally)
    const seedRef = useRef(typeof seed === "number" ? seed : Math.random());

    const { v, n } = useMemo(() => {
        // If we received a specific value in props, we use it.
        if (typeof value === "number" && typeof count === "number") {
            return { v: clampRating(value), n: Math.max(0, Math.floor(count)) };
        }

        // Otherwise “lifelike” random (but stable during the component’s lifecycle)
        const r = seedRef.current;

        // Average between 4.2 – 4.9, rounded to the nearest tenth
        const rndRating = Math.round((4.0 + (0.7 * r)) * 10) / 10;

        // Number of opinions between 24 and 320
        const rndCount = 24 + Math.floor(r * 297);

        return {
            v: clampRating(value ?? rndRating),
            n: typeof count === "number" ? Math.max(0, Math.floor(count)) : rndCount,
        };
    }, [value, count]);

    const full = Math.floor(v);
    const half = v - full >= 0.5;

    return (
        <div
            className="muted"
            style={{ display: "flex", alignItems: "center", gap: 2, opacity: 0.9 }}
            aria-label={`Értékelés: ${v.toFixed(1)} / 5 (${n} vélemény)`}
            title={`${v.toFixed(1)} / 5 (${n})`}
        >
            {Array.from({ length: 5 }).map((_, i) => {
                let color = "#e5e7eb";
                if (i < full) color = "#f59e0b";
                else if (i === full && half) color = "#fbbf24";

                return (
                    <span key={i} style={{ lineHeight: 0, color }}>
                        <StarIcon size={size} />
                    </span>
                );
            })}
            <span style={{ fontSize: 13 }}>
                {v.toFixed(1)} ({n})
            </span>
        </div>
    );
}

function clampRating(x) {
    const num = Number(x);
    if (Number.isNaN(num)) return 4.5;
    // We compress it to between 0 and 5, then round it to the nearest tenth
    return Math.min(5, Math.max(0, Math.round(num * 10) / 10));
}