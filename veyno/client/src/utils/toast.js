// utils/toast.js

function ensureToastStyles() {
  if (document.getElementById("toast-style")) return;
  const style = document.createElement("style");
  style.id = "toast-style";
  style.textContent = `
    #toast-root{
      position: fixed;
      left: 50%;
      bottom: 20px;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      pointer-events: none; /* ne fogja a kattintást a mögötte levő dolgokon */
    }
    .toast{
      pointer-events: auto;
      background: #111;
      color: #fff;
      padding: 10px 14px;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.22);
      opacity: 0;
      transform: translateY(8px) scale(.98);
      transition: opacity .22s ease, transform .22s ease;
      font-weight: 600;
      font-size: 14px;
      max-width: 90vw;
      text-align: center;
      border: 1px solid rgba(255,255,255,.08);
    }
    .toast.show{
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .toast--ok   { background:#111; color:#fff; }
    .toast--warn { background:#333; color:#fff; }
    .toast--err  { background:#b91c1c; color:#fff; }
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Displays a toast message.
 * @param {string} msg - üzenet
 * @param {{type?: 'ok'|'warn'|'err', duration?: number}} opts
 * @returns {() => void}
 */
export const toast = (msg, opts = {}) => {
  ensureToastStyles();
  const root = ensureRoot();

  const el = document.createElement("div");
  const type = opts.type || "ok";
  el.className = `toast toast--${type}`;
  el.textContent = String(msg || "");
  root.appendChild(el);

  // start animation in the next frame
  requestAnimationFrame(() => el.classList.add("show"));

  const duration = Number.isFinite(opts.duration) ? Number(opts.duration) : 2500;

  const remove = () => {
    el.classList.remove("show");
    el.addEventListener(
      "transitionend",
      () => {
        el.remove();
        // if it is empty, we can also delete the root
        if (!root.childElementCount) {
          root.remove();
        }
      },
      { once: true }
    );
  };

  const timer = setTimeout(remove, duration);
  el.addEventListener("click", () => {
    clearTimeout(timer);
    remove();
  });

  return remove;
};
