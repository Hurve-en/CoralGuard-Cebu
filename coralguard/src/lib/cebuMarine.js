export const CEBU_REEF_SITES = [
  { name: "Moalboal Reef Wall", location: "Moalboal, Cebu", lat: 9.9367, lng: 123.3972 },
  { name: "Pescador Island", location: "Pescador Island", lat: 9.8667, lng: 123.3667 },
  { name: "Malapascua Shoal", location: "Malapascua Island", lat: 11.3333, lng: 124.1167 },
  { name: "Mactan North Reef", location: "Mactan Island", lat: 10.3157, lng: 123.9494 },
  { name: "Camotes Reef", location: "Camotes Island", lat: 10.6667, lng: 124.35 },
  { name: "Olango Reef Flat", location: "Olango Island", lat: 10.2667, lng: 124.0667 },
  { name: "Bantayan Reef", location: "Bantayan Island", lat: 11.1667, lng: 123.7167 },
];

const MARINE_API_URL = "https://marine-api.open-meteo.com/v1/marine";

export function findCebuSiteByLocation(location) {
  const normalized = String(location || "").trim().toLowerCase();
  return CEBU_REEF_SITES.find((site) => site.location.toLowerCase() === normalized);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toThermalRiskModel(sst, avg24h) {
  if (!Number.isFinite(sst)) {
    return {
      status: "At Risk",
      healthScore: 50,
      bleachingPercent: 40,
      coveragePercent: 50,
      confidence: "Low",
      uncertainty: 25,
      threat: "Insufficient marine data",
    };
  }

  const anomaly = Number.isFinite(avg24h) ? sst - avg24h : 0;
  // Continuous risk score from temperature and anomaly.
  const healthScore = clamp(
    Math.round(96 - (sst - 27) * 22 - Math.max(0, anomaly) * 18),
    18,
    95,
  );
  const bleachingPercent = clamp(
    Math.round((100 - healthScore) * 0.9 + Math.max(0, anomaly) * 12),
    3,
    95,
  );
  const coveragePercent = clamp(
    Math.round(88 - bleachingPercent * 0.7),
    15,
    90,
  );

  const status =
    healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";

  const confidence = Number.isFinite(avg24h)
    ? Math.abs(anomaly) < 0.35
      ? "Medium"
      : "Low"
    : "Low";

  const uncertainty = confidence === "Medium" ? 14 : 20;
  const threat =
    sst >= 30.5
      ? "High thermal stress signal (SST-based)"
      : sst >= 29
        ? "Moderate thermal stress signal (SST-based)"
        : "Low thermal stress signal (SST-based)";

  return {
    status,
    healthScore,
    bleachingPercent,
    coveragePercent,
    confidence,
    uncertainty,
    threat,
  };
}

function timeAgoFromIso(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (!Number.isFinite(diff) || diff < 0) return "recently";
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function latestFiniteValue(values = []) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return null;
}

export async function fetchCebuThermalReports(limit = 6) {
  const sites = CEBU_REEF_SITES.slice(0, Math.max(1, limit));
  const results = await Promise.all(
    sites.map(async (site) => {
      const params = new URLSearchParams({
        latitude: String(site.lat),
        longitude: String(site.lng),
        hourly: "sea_surface_temperature",
        past_hours: "24",
        forecast_hours: "1",
        timezone: "Asia/Manila",
      });

      const res = await fetch(`${MARINE_API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error(`Marine API failed for ${site.name}`);
      const data = await res.json();

      const times = data?.hourly?.time || [];
      const sstValues = data?.hourly?.sea_surface_temperature || [];
      const latestSst = latestFiniteValue(sstValues);
      const latestIdx = sstValues.lastIndexOf(latestSst);
      const timestamp = latestIdx >= 0 ? times[latestIdx] : new Date().toISOString();
      const recentAvg = sstValues
        .filter((v) => Number.isFinite(v))
        .reduce((a, b, _, arr) => a + b / arr.length, 0);
      const thermal = toThermalRiskModel(latestSst, recentAvg);

      return {
        id: `${site.location}-${timestamp}`,
        name: site.name,
        lat: site.lat,
        lng: site.lng,
        score: thermal.healthScore,
        status: thermal.status,
        location: site.location,
        lastReport: timeAgoFromIso(timestamp),
        bleach: thermal.bleachingPercent,
        coverage: thermal.coveragePercent,
        threat: thermal.threat,
        confidence: thermal.confidence,
        uncertainty: thermal.uncertainty,
        seaSurfaceTemp: latestSst,
        seaSurfaceTemp24hAvg: Number.isFinite(recentAvg) ? recentAvg : null,
        observedAt: timestamp,
        source: "open-meteo-marine",
        method: "Thermal Risk Estimate (SST-based)",
      };
    }),
  );

  return results;
}

export const CEBU_THERMAL_DATASET_INFO = {
  provider: "Open-Meteo Marine API",
  endpoint: "https://marine-api.open-meteo.com/v1/marine",
  variables: ["sea_surface_temperature"],
  updateNote:
    "Marine model data is updated by upstream models (typically multiple times daily depending on model).",
};
