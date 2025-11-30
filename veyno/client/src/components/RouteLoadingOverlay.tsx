//client/src/components/RouteLoadingOverlay.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLoading } from "@/providers/GlobalLoadingProvider";

export default function RouteLoadingOverlay() {
  const { show, hide } = useGlobalLoading();
  const location = useLocation();

  useEffect(() => {
    show("Loading pages...");
    const t = setTimeout(() => hide(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}
