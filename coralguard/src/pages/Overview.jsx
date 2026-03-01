import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScoreRing from "../components/ScoreRing";
import { loadUnifiedReefFeed } from "../lib/reefFeed";

const statusColor = (s) =>
  ({ Healthy: "#4ade80", "At Risk": "#fb923c", Critical: "#f87171" })[s] ||
  "#94a3b8";

const scoreColor = (n) =>
  n >= 65 ? "#4ade80" : n >= 40 ? "#fb923c" : "#f87171";

const statusBg = (s) =>
  ({
    Healthy: "rgba(74,222,128,0.08)",
    "At Risk": "rgba(251,146,60,0.08)",
    Critical: "rgba(248,113,113,0.08)",
  })[s];

export default function Overview() {
  const navigate = useNavigate();
  const [reefs, setReefs] = useState([]);
  const [sourceLabel, setSourceLabel] = useState("Loading...");
  const [dataNote, setDataNote] = useState("");

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      const {
        reefs: feed,
        sourceLabel: source,
        dataNote: note,
      } = await loadUnifiedReefFeed(8);
      if (!active) return;
      setReefs(feed);
      setSourceLabel(source);
      setDataNote(note || "");
    };

    loadReports();
    return () => {
      active = false;
    };
  }, []);

  const avgScore = reefs.length
    ? Math.round(reefs.reduce((a, r) => a + r.score, 0) / reefs.length)
    : 0;
  const healthy = reefs.filter((r) => r.status === "Healthy").length;
  const atRisk = reefs.filter((r) => r.status === "At Risk").length;
  const critical = reefs.filter((r) => r.status === "Critical").length;

  return (
    <div className="pb-20">
      {/* ── Hero ── */}
      <div
        className="px-12 pt-20 pb-16 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-2xl">
          <p
            className="text-xs uppercase tracking-widest mb-5"
            style={{
              color: "#4ade80",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.2em",
            }}
          >
            SDG 14 · Life Below Water
          </p>

          <h1
            className="mb-6 leading-none tracking-tight"
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "clamp(42px, 6vw, 72px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "#f8fafc",
            }}
          >
            Protecting
            <br />
            <em
              style={{
                fontStyle: "italic",
                color: "rgba(248,250,252,0.35)",
              }}
            >
              Cebu's
            </em>{" "}
            Reefs
          </h1>

          <p
            className="mb-10 leading-relaxed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: "rgba(248,250,252,0.45)",
              maxWidth: 480,
            }}
          >
            AI-powered coral reef monitoring for fisherfolk, divers, and LGUs
            across Cebu — real-time health scores, threat detection, and
            community reporting.
          </p>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate("/analyze")}
              className="text-sm font-semibold px-7 py-3 rounded-full transition-opacity hover:opacity-80"
              style={{
                background: "#f8fafc",
                color: "#0a0a0a",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Analyze a Reef Photo →
            </button>
            <button
              onClick={() => navigate("/reefs")}
              className="text-sm font-medium px-7 py-3 rounded-full transition-all hover:border-white/30"
              style={{
                background: "transparent",
                color: "rgba(248,250,252,0.6)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              View Reef Map
            </button>
          </div>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div
        className="grid border-b"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {[
          {
            label: "Avg Health Score",
            val: avgScore,
            unit: "/100",
            color: scoreColor(avgScore),
          },
          {
            label: "Healthy Reefs",
            val: healthy,
            unit: ` of ${reefs.length}`,
            color: "#4ade80",
          },
          { label: "At Risk", val: atRisk, unit: " reefs", color: "#fb923c" },
          {
            label: "Critical",
            val: critical,
            unit: " reefs",
            color: "#f87171",
          },
        ].map((m, i) => (
          <div
            key={i}
            className="px-10 py-9"
            style={{
              borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
          >
            <div
              className="text-xs uppercase mb-3"
              style={{
                letterSpacing: "0.15em",
                color: "rgba(248,250,252,0.3)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 44,
                fontWeight: 400,
                lineHeight: 1,
                color: m.color,
              }}
            >
              {m.val}
              <span
                style={{
                  fontSize: 16,
                  color: "rgba(248,250,252,0.3)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {m.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Reports ── */}
      <div className="px-12 pt-12">
        <div className="flex items-center justify-between mb-6">
          <p
            className="text-xs uppercase tracking-widest"
            style={{
              color: "rgba(248,250,252,0.3)",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.15em",
            }}
          >
            Recent Reports
          </p>
          <button
            onClick={() => navigate("/reefs")}
            className="text-xs transition-colors hover:text-white/60"
            style={{
              background: "none",
              border: "none",
              color: "rgba(248,250,252,0.4)",
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>
        <p
          className="text-xs mb-4"
          style={{
            color: "rgba(248,250,252,0.35)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {sourceLabel}
        </p>
        {dataNote && (
          <p
            className="text-xs mb-4"
            style={{
              color: "rgba(248,250,252,0.28)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {dataNote}
          </p>
        )}

        <div>
          {reefs.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-5 cursor-pointer group"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              onClick={() => navigate("/reefs")}
            >
              <div>
                <div
                  className="text-sm font-medium mb-1 group-hover:text-white transition-colors"
                  style={{
                    color: "#f8fafc",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {r.name}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: "rgba(248,250,252,0.3)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {r.location} · {r.lastReport}
                  {r.method ? ` · ${r.method}` : ""}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    background: statusBg(r.status),
                    color: statusColor(r.status),
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {r.status}
                </div>
                <div
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: 22,
                    color: scoreColor(r.score),
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {r.score}
                </div>
                <ScoreRing score={r.score} size={40} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
