//client/src/components/Sidebar.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api.js";

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const [cats, setCats] = useState([]);
    const location = useLocation();

    // Open Sidebar from Header event
    useEffect(() => {
        const onOpen = () => setOpen(true);
        window.addEventListener("open-sidebar", onOpen);
        return () => window.removeEventListener("open-sidebar", onOpen);
    }, []);

    // Closing for change of direction
    useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

    // Load categories from the API
    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const { data } = await api.get("/categories");
                if (!stop && Array.isArray(data)) setCats(data);
            } catch (e) {
                console.warn("Failed to load categories:", e?.response?.status, e?.message);
                setCats([]);
            }
        };
        load();
        const t = setInterval(load, 60_000);
        return () => { stop = true; clearInterval(t); };
    }, []);

    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const { data } = await api.get("/categories");
                console.log("Sidebar /api/categories ->", data);
                if (!stop && Array.isArray(data)) setCats(data);
            } catch (e) {
                console.warn("Failed to load categories:", e?.response?.status, e?.message);
                setCats([]);
            }
        };
        load();
        return () => { stop = true; };
    }, []);

    // Menu order: All products → dynamic categories → Promotions → About us
    const items = useMemo(() => {
        const first = [{ slug: "osszes", title: "All products", to: "/" }];
        const dynamic = cats.map(c => ({
            slug: c.slug,
            title: c.title,
            to: `/category/${c.slug}`,
            count: c.count,
        }));
        const tail = [
            { slug: "rolunk", title: "About", to: "/about" },
        ];
        return [...first, ...dynamic, ...tail];
    }, [cats]);

    const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));
    const close = () => setOpen(false);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, pointerEvents: open ? "auto" : "none" }} aria-hidden={!open}>

            <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", opacity: open ? 1 : 0, transition: "opacity .2s" }} />

            <aside role="dialog" aria-modal="true" aria-label="Kategória menü"
                style={{
                    position: "absolute", top: 0, left: 0, height: "100%", width: 300, maxWidth: "85vw",
                    background: "#fff", boxShadow: "2px 0 16px rgba(0,0,0,.15)",
                    transform: open ? "translateX(0)" : "translateX(-102%)", transition: "transform .25s",
                    display: "flex", flexDirection: "column",
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #eee" }}>
                    <strong style={{ fontSize: 16 }}>Categories</strong>
                    <button onClick={close} aria-label="Close menu"
                        style={{ border: "none", background: "transparent", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button>
                </div>

                <nav style={{ padding: 8, overflowY: "auto" }}>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {items.length === 0 && (
                            <li style={{ padding: "10px 12px", color: "#888" }}>No category</li>
                        )}
                        {items.map((c) => (
                            <li key={c.slug}>
                                <Link to={c.to}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "10px 12px", borderRadius: 8, textDecoration: "none",
                                        color: isActive(c.to) ? "#fff" : "#111",
                                        background: isActive(c.to) ? "#000000ff" : "transparent",
                                    }}>
                                    <span>{c.title}</span>
                                    {typeof c.count === "number" && !["osszes", "rolunk"].includes(c.slug) && (
                                        <span style={{ fontSize: 12, opacity: .7, padding: "2px 6px", borderRadius: 999, border: "1px solid #e5e7eb" }}>
                                            {c.count}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </div>
    );
}
