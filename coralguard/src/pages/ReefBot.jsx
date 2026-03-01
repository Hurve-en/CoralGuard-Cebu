import { useState, useRef, useEffect } from "react";
import { chatWithReefBot, isGeminiConfigured } from "../lib/gemini";

const QUICK_QUESTIONS = [
  "Unsa ang coral bleaching?",
  "Which Cebu reefs are most at risk?",
  "How to report illegal fishing?",
  "What can I do to help protect reefs?",
  "Unsay buhaton kung makita ang bleached coral?",
];

export default function ReefBot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Kumusta! I'm ReefBot — your AI guide for Cebu's coral reefs. Ask me anything in English or Cebuano! 🪸",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [connectionState, setConnectionState] = useState(
    isGeminiConfigured() ? "online" : "degraded",
  );
  const endRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await chatWithReefBot(history, msg);
      const isFallback =
        /temporarily unavailable|temporary nga issue|Gemini key not configured/i.test(
          reply,
        );
      setConnectionState(isFallback ? "degraded" : "online");
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
      setHistory((prev) => [
        ...prev,
        { role: "user", text: msg },
        { role: "bot", text: reply },
      ]);
    } catch (err) {
      console.error(err);
      setConnectionState("degraded");
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Pasensya na, dili ko makonektar karon. Please check your connection and try again.",
        },
      ]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex flex-col coral-chat-shell"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-12 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p
          className="text-xs uppercase mb-1"
          style={{
            letterSpacing: "0.2em",
            color: "rgba(248,250,252,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          AI Assistant
        </p>
        <div className="flex items-center justify-between">
          <h2
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 28,
              fontWeight: 400,
              color: "#f8fafc",
            }}
          >
            ReefBot
          </h2>
          <div
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{
              background:
                connectionState === "online"
                  ? "rgba(74,222,128,0.08)"
                  : "rgba(251,146,60,0.12)",
              border:
                connectionState === "online"
                  ? "1px solid rgba(74,222,128,0.15)"
                  : "1px solid rgba(251,146,60,0.25)",
              color: connectionState === "online" ? "#4ade80" : "#fb923c",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connectionState === "online" ? "#4ade80" : "#fb923c",
                animation: "pulse 2s infinite",
              }}
            />
            {connectionState === "online"
              ? "Gemini AI · Online"
              : "Gemini AI · Fallback"}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-12 py-8 coral-chat-scroll"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="flex"
            style={{
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              className="max-w-lg px-5 py-4 text-sm leading-relaxed coral-chat-bubble"
              style={{
                borderRadius:
                  m.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                background:
                  m.role === "user" ? "#f8fafc" : "rgba(255,255,255,0.04)",
                border:
                  m.role === "bot"
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
                color: m.role === "user" ? "#0a0a0a" : "rgba(248,250,252,0.75)",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {m.role === "bot" && (
                <div
                  className="text-xs uppercase mb-2 font-semibold"
                  style={{
                    color: "#4ade80",
                    letterSpacing: "0.1em",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  🪸 ReefBot
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div
              className="px-5 py-4 flex items-center gap-1.5"
              style={{
                borderRadius: "18px 18px 18px 4px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "rgba(248,250,252,0.4)",
                    animation: `bounce 1s ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Quick Questions ── */}
      <div
        className="flex-shrink-0 px-12 pt-3 pb-2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-2 flex-wrap">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full transition-all hover:border-white/20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(248,250,252,0.45)",
                fontFamily: "'DM Sans', sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input ── */}
      <div
        className="flex-shrink-0 px-12 py-5 border-t coral-chat-input-wrap"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about Cebu's coral reefs…"
            className="flex-1 px-5 py-3.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f8fafc",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "rgba(74,222,128,0.3)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.08)")
            }
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="px-6 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background:
                loading || !input.trim() ? "rgba(248,250,252,0.3)" : "#f8fafc",
              color: "#0a0a0a",
              border: "none",
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
