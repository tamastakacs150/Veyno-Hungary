// client/src/stores/wishlistStore.js
import api from "../utils/api.js";

const KEY = "wishlist";
let online = false;
let syncing = false;

// internal state
let ids = (() => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
    catch { return []; }
})();

const listeners = new Set();

function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { }
}
function notify() {
    listeners.forEach((fn) => { try { fn(); } catch { } });
}

async function fetchFromServer() {
    const { data } = await api.get("/favorites");
    const next = (data?.favorites || []).map(p => String(p._id || p));
    ids = next;
    persist(); notify();
    return ids;
}

async function toggleOnServer(productId) {
    const { data } = await api.post("/favorites/toggle", { productId });
    const next = (data?.favorites || []).map(p => String(p._id || p));
    ids = next;
    persist(); notify();
    return ids;
}

async function bulkAddToServer(productIds) {
    const current = new Set(ids);
    const toAdd = productIds.filter(id => !current.has(String(id)));
    for (const id of toAdd) {
        await api.post("/favorites/toggle", { productId: id });
    }
    return fetchFromServer();
}

export const wishlistStore = {
    // current list
    getSnapshot: () => ids,

    subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },

    has: (id) => ids.some(x => String(x) === String(id)),

    // Local change only (guest mode)
    toggleLocal: (id) => {
        const s = String(id);
        ids = wishlistStore.has(s) ? ids.filter(x => String(x) !== s) : [...ids, s];
        persist(); notify();

        try {
            window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: JSON.stringify(ids) }));
        } catch { }
    },

    // Public toggle – decides online/offline
    toggle: async (id) => {
        const s = String(id);
        if (!online) return wishlistStore.toggleLocal(s);
        return toggleOnServer(s);
    },

    // Passing a complete array
    set: (nextIds) => {
        ids = Array.isArray(nextIds) ? nextIds.map(String) : [];
        persist(); notify();
    },

    // ─── Integration with Auth ───

    // Invite after login: uploads local favorites and switches to server
    enableOnlineAndMerge: async () => {
        if (online || syncing) return;
        syncing = true;
        try {
            // 1) get the server status
            await fetchFromServer();
            // 2) merge the local list (if it was a guest)
            const local = (() => { try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; } })();
            if (Array.isArray(local) && local.length) {
                await bulkAddToServer(local.map(String));
                // optionally empty the local guest list:
                localStorage.removeItem(KEY);
            }
            online = true;
        } finally {
            syncing = false;
        }
    },

    // On exit: return to offline mode (the current server list is added to localStorage)
    disableOnlineKeepLocal: () => {
        online = false;
        ids = [];
        persist();
        notify();
    },

    // Session boot: if you are already logged in, just sync up
    bootOnline: async () => {
        online = true;
        await fetchFromServer();
    }
};

// native storage event (another tab in synchronous guest mode)
window.addEventListener("storage", (e) => {
    if (e.key !== KEY || online) return;
    try { ids = JSON.parse(e.newValue || "[]") ?? []; } catch { ids = []; }
    notify();
});
