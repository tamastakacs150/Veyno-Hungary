//client/src/pages/Chatbot.tsx
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import "../styles/Chatbot.css";
import { AiChatIcon, SendIcon, MinIcon, CloseIcon } from "../icons/icons";
import api from "../utils/api.js";

const GREETING = { from: "ai", text: "Hello! How can I help you?" };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  // message list autoscroll
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, loading]);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // bubble & window positioning
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const [winPos, setWinPos] = useState({ right: 20, bottom: 90 });

  const positionWindow = () => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const r = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const bubbleRight = vw - (r.left + r.width);
    const bubbleBottom = vh - (r.top + r.height);

    const right = Math.max(0, Math.min(bubbleRight, 20));
    const bottom = Math.max(0, Math.round(bubbleBottom));

    setWinPos({ right, bottom });
  };

  useLayoutEffect(() => {
    positionWindow();
  }, []);

  const openChat = () => {
    positionWindow();
    setOpen(true);
    requestAnimationFrame(() => positionWindow());
  };
  const closeChat = () => setOpen(false);

  // open, follow scroll/resize
  useEffect(() => {
    if (!open) return;
    const onScroll = () => positionWindow();
    const onResize = () => positionWindow();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    requestAnimationFrame(positionWindow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // send
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { from: "me", text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/ai/support", { message: text });
      setMessages((m) => [...m, { from: "ai", text: data?.reply || "…" }]);
    } catch {
      setMessages((m) => [...m, { from: "ai", text: "Sorry, an error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // confirm deletion
  const askClear = () => setConfirmClose(true);
  const cancelConfirm = () => setConfirmClose(false);
  const confirmAndClose = () => {
    setMessages([GREETING]);
    setInput("");
    setConfirmClose(false);
    setOpen(false);
  };

  return (
    <div className="chatbot-container">
      {/* Bubble button – always visible, can also remain behind the panel */}
      <button
        ref={bubbleRef}
        type="button"
        className={`chat-bubble-btn ${showBubble ? "show" : ""}`}
        onClick={openChat}
        aria-label="Open chat"
        title="Chat"
      >
        <AiChatIcon width={26} height={26} />
      </button>

      {/* FLYOUT: always in DOM – the .open class animates the opening/closing */}
      <div
        className={`chat-flyout ${open ? "open" : ""}`}
        style={{ right: `${winPos.right}px`, bottom: `${winPos.bottom}px` }}
        aria-hidden={!open}
      >
        <div className="chat-window">
          <div className="chat-header">
            <strong>Customer Service</strong>
            <div>
              <button
                type="button"
                className="icon-btn header-btn"
                onClick={closeChat}
                aria-label="Minimize"
                title="Minimize"
              >
                <MinIcon size={18} />
              </button>
              <button
                type="button"
                className="icon-btn header-btn"
                onClick={askClear}
                aria-label="Close"
                title="Close"
              >
                <CloseIcon size={18} />
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.from}`}>
                <div className={`avatar left ${m.from === "ai" ? "ai" : ""}`}>
                  {m.from === "ai" ? "AI" : ""}
                </div>
                <div className={`bubble ${m.from}`}>{m.text}</div>
                <div className={`avatar right ${m.from === "me" ? "me" : ""}`}>
                  {m.from === "me" ? "You" : ""}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-row ai">
                <div className="avatar left ai">AI</div>
                <div className="bubble ai">
                  <span className="typing" aria-hidden="true">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </div>
                <div className="avatar right" />
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write your message here…"
              disabled={loading}
            />
            <button
              type="button"
              className="send-btn"
              onClick={send}
              disabled={loading}
              aria-label="Send"
              title="Send"
            >
              <SendIcon size={18} />
            </button>
          </div>

          {confirmClose && (
            <>
              <div className="chat-confirm-backdrop" onClick={cancelConfirm} />
              <div className="chat-confirm" role="dialog" aria-modal="true">
                <div className="chat-confirm-head">
                  <strong>Are you sure you want to close the chat?</strong>
                  <button
                    type="button"
                    className="icon-btn confirm-x"
                    onClick={cancelConfirm}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
                <div className="chat-confirm-body">
                  This deletes the whole chat. Continue?
                </div>
                <div className="chat-confirm-actions">
                  <button type="button" className="btn-secondary" onClick={cancelConfirm}>
                    Cancel
                  </button>
                  <button type="button" className="btn-danger" onClick={confirmAndClose}>
                    Yes, delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
