// client/src/hooks/useWishlist.js
import { useSyncExternalStore } from "react";
import { wishlistStore } from "../stores/wishlistStore";

export default function useWishlist() {
  // all components listen to the same store
  const ids = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getSnapshot
  );

  return {
    ids,
    has: (id) => wishlistStore.has(id),
    toggle: (id) => wishlistStore.toggle(id),
    set: (arr) => wishlistStore.set(arr),
  };
}

