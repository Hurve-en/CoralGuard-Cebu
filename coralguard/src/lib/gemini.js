function readGeminiApiKey() {
  const env = import.meta.env || {};
  const candidates = [
    env.VITE_GEMINI_API_KEY,
    env.VITE_gemini_API_Key,
    env.VITE_GEMINI_API_Key,
    env.VITE_Gemini_API_Key,
  ];
  const key = candidates.find((v) => typeof v === "string" && v.trim());
  return key ? key.trim() : "";
}

const API_KEY = readGeminiApiKey();
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];
const GEMINI_TIMEOUT_MS = 25000;
const MODELS_CACHE_MS = 1000 * 60 * 30;
let cachedDiscoveredModels = null;
let cachedDiscoveredAt = 0;

function makeApiUrl(key, model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

function hasValidGeminiKey() {
  return Boolean(API_KEY && API_KEY.startsWith("AIza"));
}

function normalizeModelName(name) {
  return String(name || "").replace(/^models\//, "").trim();
}

function isPreferredTextModel(name) {
  const n = String(name || "").toLowerCase();
  if (!n.includes("gemini")) return false;
  if (!n.includes("flash")) return false;
  if (
    n.includes("image") ||
    n.includes("tts") ||
    n.includes("robotics") ||
    n.includes("computer-use") ||
    n.includes("preview") ||
    n.includes("pro")
  ) {
    return false;
  }
  return true;
}

function parseAnalysisFromLooseText(text) {
  const t = String(text || "");
  if (!t.trim()) return null;

  const num = (pattern) => {
    const m = t.match(pattern);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const statusMatch = t.match(/\b(Healthy|At Risk|Critical)\b/i);
  const clarityMatch = t.match(/\b(Excellent|Good|Fair|Poor)\b/i);
  const threatMatch =
    t.match(/(?:main\s*threat|threat)\s*[:-]\s*([^\n.]+)/i) ||
    t.match(/threatened by\s*([^\n.]+)/i);
  const speciesMatch = t.match(/(?:species)\s*[:-]\s*([^\n.]+)/i);
  const urgencyMatch = t.match(/\b(Low|Medium|High|Critical)\b(?=.*urgency)/i);
  const recommendationMatch = t.match(
    /(?:recommendation|recommended action)\s*[:-]\s*([\s\S]+)/i,
  );

  const loose = {
    healthScore:
      num(/health\s*score[^0-9]*(\d{1,3})/i) ??
      num(/\bscore[^0-9]*(\d{1,3})/i),
    status: statusMatch?.[1],
    bleachingPercent: num(/bleach(?:ing)?[^0-9]*(\d{1,3})\s*%?/i),
    coralCoverage: num(/(?:coral\s*)?coverage[^0-9]*(\d{1,3})\s*%?/i),
    waterClarity: clarityMatch?.[1],
    mainThreat: threatMatch?.[1]?.trim(),
    species: speciesMatch?.[1]?.trim(),
    urgency: urgencyMatch?.[1],
    recommendation: recommendationMatch?.[1]?.trim(),
  };

  const hasSignal =
    loose.healthScore != null ||
    loose.bleachingPercent != null ||
    loose.coralCoverage != null ||
    Boolean(loose.status);

  return hasSignal ? loose : null;
}

async function discoverGeminiModels() {
  if (!hasValidGeminiKey()) return GEMINI_MODELS;

  const now = Date.now();
  if (
    Array.isArray(cachedDiscoveredModels) &&
    cachedDiscoveredModels.length > 0 &&
    now - cachedDiscoveredAt < MODELS_CACHE_MS
  ) {
    return cachedDiscoveredModels;
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetchWithTimeout(listUrl, { method: "GET" }, 12000);
    const data = await response.json();

    if (!response.ok) {
      console.warn("[Gemini] models.list failed", data);
      return GEMINI_MODELS;
    }

    const discovered = (data?.models || [])
      .filter((m) => {
        const methods = m?.supportedGenerationMethods || [];
        return (
          methods.includes("generateContent") &&
          String(m?.name || "").includes("gemini")
        );
      })
      .map((m) => normalizeModelName(m?.name))
      .filter(Boolean);

    const unique = [...new Set(discovered)];
    if (unique.length === 0) return GEMINI_MODELS;

    const filtered = unique.filter(isPreferredTextModel);
    const candidateModels = filtered.length ? filtered : unique;
    const preferred = [...GEMINI_MODELS, "gemini-2.0-flash-lite", "gemini-flash-latest"];
    const rank = (name) => {
      const idx = preferred.findIndex(
        (p) => name === p || name.startsWith(`${p}-`),
      );
      return idx === -1 ? 999 : idx;
    };

    candidateModels.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    cachedDiscoveredModels = candidateModels.slice(0, 5);
    cachedDiscoveredAt = now;
    console.log("[Gemini] discovered models", cachedDiscoveredModels);
    return cachedDiscoveredModels;
  } catch (error) {
    console.warn("[Gemini] models discovery failed", error);
    return GEMINI_MODELS;
  }
}

async function fetchWithTimeout(url, options, timeoutMs = GEMINI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function extractCandidateText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

function safeJsonFromText(text) {
  const clean = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAnalysisResult(raw) {
  const statusInput = String(raw?.status || "").toLowerCase();
  const status = statusInput.includes("critical")
    ? "Critical"
    : statusInput.includes("healthy")
      ? "Healthy"
      : "At Risk";

  const urgencyInput = String(raw?.urgency || "").toLowerCase();
  const urgency = urgencyInput.includes("critical")
    ? "Critical"
    : urgencyInput.includes("high")
      ? "High"
      : urgencyInput.includes("medium")
        ? "Medium"
        : "Low";

  const clarityInput = String(raw?.waterClarity || "").toLowerCase();
  const waterClarity = clarityInput.includes("excellent")
    ? "Excellent"
    : clarityInput.includes("good")
      ? "Good"
      : clarityInput.includes("poor")
        ? "Poor"
        : "Fair";

  return {
    healthScore: clamp(Number(raw?.healthScore), 0, 100),
    status,
    bleachingPercent: clamp(Number(raw?.bleachingPercent), 0, 100),
    coralCoverage: clamp(Number(raw?.coralCoverage), 0, 100),
    waterClarity,
    mainThreat: raw?.mainThreat || "Unclear from image",
    species: raw?.species || "Unknown",
    urgency,
    recommendation:
      raw?.recommendation ||
      "Continue routine reef monitoring and verify conditions with an in-person survey.",
    _meta: {
      source: "gemini",
      fallback: false,
    },
  };
}

function analysisFallback(location, reason = "Gemini unavailable") {
  return {
    healthScore: 61,
    status: "At Risk",
    bleachingPercent: 35,
    coralCoverage: 52,
    waterClarity: "Fair",
    mainThreat: "Heat stress and sedimentation",
    species: "Mixed hard corals (possible Acropora/Porites)",
    urgency: "Medium",
    recommendation: `Initial AI estimate only. Recheck this site at ${location || "Cebu, Philippines"} with a clearer photo and pair with diver transect notes before policy action.`,
    _meta: {
      source: "fallback",
      fallback: true,
      reason,
    },
  };
}

export async function analyzeCoralImage(base64Image, mimeType, location) {
  // If API key missing, return a deterministic demo result (prevents runtime crashes during demos)
  if (!hasValidGeminiKey()) {
    console.warn(
      "VITE_GEMINI_API_KEY not set — returning demo analysis result.",
    );
    return analysisFallback(location, "Missing/invalid Gemini API key");
  }

  const prompt = `You are CoralGuard AI, an expert marine biologist analyzing coral reef health in Cebu, Philippines.

Task:
1) Visually analyze ONLY what appears in the image.
2) Estimate coral condition from visible evidence: bleaching extent, coral cover, rubble/algae, and water clarity.
3) Do NOT default to "At Risk". Choose values that match the specific photo.
4) If image quality is limited, still estimate with caution from available evidence.

Scoring guidance:
- Healthy (70-100): mostly live coral color, low bleaching, good structure and clarity.
- At Risk (40-69): mixed live/bleached or algal overgrowth, moderate stress signals.
- Critical (0-39): severe bleaching, rubble dominance, dead coral, very poor condition.

Respond ONLY as valid JSON (no markdown, no extra text):
{
  "healthScore": <number 0-100>,
  "status": "<Healthy|At Risk|Critical>",
  "bleachingPercent": <number 0-100>,
  "coralCoverage": <number 0-100>,
  "waterClarity": "<Excellent|Good|Fair|Poor>",
  "mainThreat": "<brief threat>",
  "species": "<coral species if visible or Unknown>",
  "recommendation": "<2-3 sentence recommendation for Cebu LGU or fisherfolk>",
  "urgency": "<Low|Medium|High|Critical>"
}
Location context: ${location || "Cebu, Philippines"}
Use concrete visual cues from this image to set values.`;

  const safeMimeType = mimeType && mimeType.startsWith("image/")
    ? mimeType
    : "image/jpeg";

  try {
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: safeMimeType,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        topP: 0.9,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      },
    };

    console.log("[Gemini][analyze] request", {
      mimeType: safeMimeType,
      location: location || "Cebu, Philippines",
      base64Length: (base64Image || "").length,
    });
    const modelsToTry = await discoverGeminiModels();
    let lastError = null;
    for (const model of modelsToTry) {
      const API_URL = makeApiUrl(API_KEY, model);
      try {
        const response = await fetchWithTimeout(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log("[Gemini][analyze] raw response", { model, data });

        if (!response.ok) {
          console.error("[Gemini][analyze] API error", { model, data });
          throw new Error(data?.error?.message || "Gemini request failed");
        }

        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Gemini blocked prompt/image: ${blockReason}`);
        }

        const text = extractCandidateText(data);
        const parsed = safeJsonFromText(text) || parseAnalysisFromLooseText(text);
        if (!parsed) {
          throw new Error("Gemini returned non-JSON analysis output");
        }

        const normalized = normalizeAnalysisResult(parsed);
        console.log("[Gemini][analyze] normalized result", {
          model,
          normalized,
        });
        return normalized;
      } catch (modelError) {
        lastError = modelError;
        console.warn("[Gemini][analyze] model attempt failed", {
          model,
          error: modelError?.message,
        });
      }
    }
    throw lastError || new Error("All Gemini model attempts failed");
  } catch (e) {
    console.warn(
      "[Gemini][analyze] failed; returning fallback analysis",
      e,
    );
    return analysisFallback(location, e?.message || "Gemini request failed");
  }
}

export async function chatWithReefBot(history, userMessage) {
  if (!hasValidGeminiKey()) {
    console.warn(
      "VITE_GEMINI_API_KEY not set — returning canned ReefBot reply.",
    );
    return "Pasensya na, Gemini key not configured. Try again later or set VITE_GEMINI_API_KEY.";
  }

  const systemContext = `You are ReefBot for CoralGuard Cebu.
Audience: fisherfolk, divers, LGU officers, students, community volunteers.
Language rule: if user writes in Cebuano/Bisaya, reply in Cebuano; otherwise reply in English.
Keep replies practical, concise, and local to Cebu.

Cebu reef context:
- Key sites: Moalboal/Pescador, Malapascua, Mactan, Olango, Bantayan, Camotes.
- Common threats: coral bleaching from heat stress, destructive fishing, sedimentation/coastal runoff, anchor damage, marine litter.
- Practical actions: mooring buoys, no-anchor zones, reef-safe tourism, community reporting, periodic transect monitoring, temporary protection during bleaching events.

Useful local contacts to mention when relevant:
- BFAR Region VII (fisheries concerns, reef incidents).
- DENR/EMB Region VII (pollution and environmental violations).
- Cebu Province/City or Municipal ENRO and Coastal Resource Management offices.
- Bantay Dagat / local marine wardens for immediate on-site enforcement.

Never invent emergency hotlines. If unsure about a phone number, advise contacting the relevant LGU office directly.`;

  const safeHistory = Array.isArray(history)
    ? history
        .filter((m) => m && typeof m.text === "string" && m.text.trim())
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }))
    : [];

  const contents = [
    ...safeHistory,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  try {
    const payload = {
      systemInstruction: {
        parts: [{ text: systemContext }],
      },
      contents,
      generationConfig: { temperature: 0.65, topP: 0.9, maxOutputTokens: 800 },
    };

    console.log("[Gemini][reefbot] request", {
      historyCount: safeHistory.length,
      userMessageLength: (userMessage || "").length,
    });
    const modelsToTry = await discoverGeminiModels();
    let lastError = null;
    for (const model of modelsToTry) {
      const API_URL = makeApiUrl(API_KEY, model);
      try {
        const response = await fetchWithTimeout(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log("[Gemini][reefbot] raw response", { model, data });

        if (!response.ok) {
          console.error("[Gemini][reefbot] API error", { model, data });
          throw new Error(data?.error?.message || "Gemini chat request failed");
        }

        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Gemini blocked chat: ${blockReason}`);
        }

        const text = extractCandidateText(data);
        if (!text) {
          throw new Error("Gemini chat response was empty");
        }
        return text;
      } catch (modelError) {
        lastError = modelError;
        console.warn("[Gemini][reefbot] model attempt failed", {
          model,
          error: modelError?.message,
        });
      }
    }
    throw lastError || new Error("All Gemini model attempts failed");
  } catch (error) {
    console.warn("[Gemini][reefbot] failed; returning fallback reply", error);
    const isBisaya = /(unsa|ngano|pwede|tabang|salamat|maayo|dili|kinsa)/i.test(
      userMessage || "",
    );
    return isBisaya
      ? "Pasensya, naay temporary nga issue sa AI karon. Alang sa coral incident sa Cebu, kontaka ang inyong LGU ENRO/CRM office o BFAR Region VII ug ihatag ang lugar, oras, ug litrato sa panghitabo."
      : "Sorry, ReefBot is temporarily unavailable. For coral incidents in Cebu, please contact your LGU ENRO/CRM office or BFAR Region VII and provide the location, time, and clear photos.";
  }
}

export function isGeminiConfigured() {
  return hasValidGeminiKey();
}
