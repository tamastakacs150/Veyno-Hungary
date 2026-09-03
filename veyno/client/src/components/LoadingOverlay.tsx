//client/src/components/LoadingOverlay.tsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Loader from "./ui/loader";

interface LoadingOverlayProps {
    open: boolean;
    label?: string;
}

export default function LoadingOverlay({ open, label }: LoadingOverlayProps) {
    const [root] = React.useState(() => {
        let el = document.getElementById("app-loading-root");
        if (!el) {
            el = document.createElement("div");
            el.id = "app-loading-root";
            document.body.appendChild(el);
        }
        return el;
    });

    useEffect(() => {
        if (open) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }
        return () => document.body.classList.remove("overflow-hidden");
    }, [open]);


    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] grid place-items-center backdrop-blur-sm bg-black/30"
            aria-modal="true" role="dialog" aria-label="Loading..."
        >
            <div className="px-6 py-5 flex items-center gap-4 bg-transparent shadow-none">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-15 bg-neutral-500 animate-pulse" />
                    <Loader />
                </div>
            </div>
        </div>,
        root
    );
}