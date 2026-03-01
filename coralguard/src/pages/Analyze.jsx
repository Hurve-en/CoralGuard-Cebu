import { useState, useRef, useEffect } from "react";
import { analyzeCoralImage } from "../lib/gemini";
import { submitReport } from "../lib/supabase";
import ScoreRing from "../components/ScoreRing";

const LOCATIONS = [
  "Moalboal, Cebu",
  "Pescador Island",
  "Malapascua Island",
  "Mactan Island",
  "Camotes Island",
  "Olango Island",
  "Bantayan Island",
  "Other / Unknown",
];

const statusBg = (s) =>
  ({
    Healthy: "rgba(74,222,128,0.08)",
    "At Risk": "rgba(251,146,60,0.08)",
    Critical: "rgba(248,113,113,0.08)",
  })[s];

const statusColor = (s) =>
  ({ Healthy: "#4ade80", "At Risk": "#fb923c", Critical: "#f87171" })[s] ||
  "#94a3b8";

const STEPS = [
  "Processing image pixels",
  "Identifying coral species",
  "Detecting bleaching patterns",
  "Calculating health score",
  "Generating recommendations",
];

export default function Analyze() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result;
        if (typeof raw !== "string") {
          reject(new Error("Failed to read image as base64"));
          return;
        }
        resolve(raw.split(",")[1] || "");
      };
      reader.onerror = () => reject(reader.error || new Error("Read error"));
      reader.readAsDataURL(file);
    });

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setSubmitError("Please upload a valid image file.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setSubmitted(false);
    setSubmitError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setSubmitError("");
    setLoading(true);
    setLoadStep(0);
    setResult(null);

    // Animate steps
    const interval = setInterval(
      () => setLoadStep((s) => Math.min(s + 1, STEPS.length - 1)),
      900,
    );

    try {
      // Convert to base64 (Gemini expects raw base64 without data URL prefix)
      const base64 = await fileToBase64(file);

      const data = await analyzeCoralImage(
        base64,
        file.type || "image/jpeg",
        location,
      );
      setResult(data);
    } catch (err) {
      console.error(err);
      // Fallback demo result
      setResult({
        healthScore: 58,
        status: "At Risk",
        bleachingPercent: 40,
        coralCoverage: 45,
        waterClarity: "Fair",
        mainThreat: "Thermal stress",
        species: "Acropora sp.",
        urgency: "Medium",
        recommendation:
          "Significant bleaching detected. Recommend reporting to BFAR Region 7 and temporarily restricting diving and fishing activities. Monitor water temperature weekly for the next 30 days.",
      });
      setSubmitError("AI analysis failed, showing fallback estimate.");
    }

    clearInterval(interval);
    setLoadStep(STEPS.length);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!result || !file) return;
    setSubmitError("");
    setSubmitting(true);
    const payload = {
      ...result,
      location: location || "Other / Unknown",
    };
    const res = await submitReport(payload, file);
    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setSubmitError("Failed to submit report. Please try again.");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSubmitted(false);
    setLoadStep(0);
    setSubmitError("");
  };

  return (
    <div className="pb-20">
      <div className="max-w-2xl mx-auto px-6 pt-12">
        {/* ── Header ── */}
        <div className="mb-10">
          <p
            className="text-xs uppercase mb-3"
            style={{
              letterSpacing: "0.2em",
              color: "rgba(248,250,252,0.3)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            AI Analysis
          </p>
          <h2
            className="mb-3"
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 36,
              fontWeight: 400,
              color: "#f8fafc",
              letterSpacing: "-0.01em",
            }}
          >
            Analyze Reef Photo
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "rgba(248,250,252,0.4)",
              lineHeight: 1.7,
            }}
          >
            Upload an underwater photo. Gemini AI will assess coral health,
            detect bleaching, and generate actionable recommendations for Cebu
            LGUs and fisherfolk.
          </p>
        </div>

        {/* ── Upload Zone ── */}
        {!preview && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            className="rounded-2xl p-16 text-center cursor-pointer transition-all mb-6"
            style={{
              border: dragOver
                ? "1px solid rgba(74,222,128,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              background: dragOver
                ? "rgba(74,222,128,0.04)"
                : "rgba(255,255,255,0.02)",
            }}
          >
            <div
              className="text-sm font-medium mb-2"
              style={{
                color: "rgba(248,250,252,0.7)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Drop a reef photo here
            </div>
            <div
              className="text-xs"
              style={{
                color: "rgba(248,250,252,0.25)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              JPG, PNG, WEBP — underwater photos recommended
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* ── Preview ── */}
        {preview && (
          <div className="mb-6 relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-2xl object-cover"
              style={{ maxHeight: 340 }}
            />
            {!loading && !result && (
              <button
                onClick={reset}
                className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(10,10,10,0.85)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f8fafc",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        )}

        {/* ── Location + Analyze Button ── */}
        {preview && !loading && !result && (
          <div className="mb-6">
            <label
              className="block text-xs uppercase mb-2"
              style={{
                letterSpacing: "0.15em",
                color: "rgba(248,250,252,0.3)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Reef Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl px-4 py-3 mb-4 text-sm appearance-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: location ? "#f8fafc" : "rgba(248,250,252,0.3)",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
              }}
            >
              <option value="">Select location…</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l} style={{ background: "#1a1a1a" }}>
                  {l}
                </option>
              ))}
            </select>

            <button
              onClick={analyze}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{
                background: "#f8fafc",
                color: "#0a0a0a",
                border: "none",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              Analyze with Gemini AI →
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="py-10">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                style={{
                  borderColor: "rgba(74,222,128,0.3)",
                  borderTopColor: "#4ade80",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span
                className="text-sm"
                style={{
                  color: "rgba(248,250,252,0.5)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Gemini AI is analyzing your photo…
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 transition-all duration-500"
                  style={{ opacity: i <= loadStep ? 1 : 0.2 }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
                    style={{
                      background:
                        i < loadStep
                          ? "#4ade80"
                          : i === loadStep
                            ? "#fb923c"
                            : "rgba(255,255,255,0.1)",
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{
                      color: i < loadStep ? "#4ade80" : "rgba(248,250,252,0.4)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {result && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            {result?._meta?.fallback && (
              <div
                className="mb-3 p-3 rounded-xl text-xs"
                style={{
                  background: "rgba(251,146,60,0.12)",
                  border: "1px solid rgba(251,146,60,0.35)",
                  color: "#fdba74",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Using fallback estimate ({result?._meta?.reason || "Gemini unavailable"}). Try another photo or check API key/network.
              </div>
            )}
            {/* Score + Status */}
            <div
              className="rounded-2xl overflow-hidden mb-4"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="flex items-center justify-between p-7"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <div
                    className="text-xs uppercase mb-2"
                    style={{
                      letterSpacing: "0.12em",
                      color: "rgba(248,250,252,0.3)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Analysis Result
                  </div>
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: 26,
                      color: "#f8fafc",
                      marginBottom: 6,
                    }}
                  >
                    {result.status}
                  </div>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      background: statusBg(result.status),
                      color: statusColor(result.status),
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Urgency: {result.urgency}
                  </span>
                </div>
                <ScoreRing score={result.healthScore} size={80} />
              </div>

              {/* Stats grid */}
              <div
                className="grid grid-cols-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {[
                  ["Bleaching", result.bleachingPercent + "%"],
                  ["Coverage", result.coralCoverage + "%"],
                  ["Clarity", result.waterClarity],
                ].map(([k, v], i) => (
                  <div
                    key={k}
                    className="p-5"
                    style={{
                      borderLeft:
                        i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div
                      className="text-xs uppercase mb-2"
                      style={{
                        letterSpacing: "0.12em",
                        color: "rgba(248,250,252,0.25)",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {k}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: 22,
                        color: "#f8fafc",
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>

              {/* Threat */}
              <div
                className="px-7 py-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="text-xs uppercase mb-2"
                  style={{
                    letterSpacing: "0.12em",
                    color: "rgba(248,250,252,0.25)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Threat Detected · Species
                </div>
                <div
                  className="text-sm font-medium"
                  style={{
                    color: "#fb923c",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {result.mainThreat} · {result.species}
                </div>
              </div>

              {/* Recommendation */}
              <div className="px-7 py-5">
                <div
                  className="text-xs uppercase mb-2"
                  style={{
                    letterSpacing: "0.12em",
                    color: "rgba(248,250,252,0.25)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  AI Recommendation
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "rgba(248,250,252,0.6)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {result.recommendation}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-xl text-sm transition-opacity hover:opacity-70"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(248,250,252,0.6)",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                }}
              >
                Analyze Another
              </button>

              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: submitting ? "rgba(74,222,128,0.5)" : "#4ade80",
                    color: "#0a0a0a",
                    border: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit to BFAR →"}
                </button>
              ) : (
                <div
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-center"
                  style={{
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    color: "#4ade80",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ✓ Submitted Successfully
                </div>
              )}
            </div>
            {submitError && (
              <p
                className="mt-3 text-xs"
                style={{
                  color: "#f87171",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {submitError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
