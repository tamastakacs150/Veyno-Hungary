//client/src/lib/loadingBus.ts

class LoadingBus {
_show?: (label?: string) => void;
_hide?: () => void;


register(show: (label?: string) => void, hide: () => void) {
this._show = show; this._hide = hide;
}
show(label?: string) { this._show?.(label); }
hide() { this._hide?.(); }
}


export const loadingBus = new LoadingBus();