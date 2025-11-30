//client/src/providers/GlobalLoadingProvider.tsx
import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";
import { loadingBus } from "@/lib/loadingBus";

interface Ctx {
show: (label?: string) => void;
hide: () => void;
setLabel: (label: string) => void;
}


const LoadingCtx = createContext<Ctx | null>(null);


export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState<string>("Loading...");

    const show = useCallback((l?: string) => {
        if (l) setLabel(l);
        setOpen(true);
    }, []);

    const hide = useCallback(() => setOpen(false), []);

    const value = useMemo(() => ({ show, hide, setLabel }), [show, hide]);

    useEffect(() => {
        loadingBus.register(show, hide);
    }, [show, hide]);

    return (
        <LoadingCtx.Provider value={value}>
            {children}
            <LoadingOverlay open={open} label={label} />
        </LoadingCtx.Provider>
    );
}

export function useGlobalLoading() {
    const ctx = useContext(LoadingCtx);
    if (!ctx) 
        throw new Error("useGlobalLoading can only be used under GlobalLoadingProvider");
    return ctx;
}