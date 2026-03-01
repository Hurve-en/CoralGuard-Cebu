import { getReports } from "./supabase";
import {
  fetchCebuThermalReports,
  CEBU_THERMAL_DATASET_INFO,
  findCebuSiteByLocation,
} from "./cebuMarine";

const STATIC_REEFS = [
  {
    id: "static-1",
    name: "Moalboal Reef Wall",
    score: 78,
    status: "Healthy",
    location: "Moalboal, Cebu",
    lastReport: "2 hrs ago",
    bleach: 12,
    coverage: 74,
    threat: "Tourism pressure",
    lat: 9.9367,
    lng: 123.3972,
    depth: "5–25m",
    source: "static-fallback",
  },
  {
    id: "static-2",
    name: "Pescador Island",
    score: 55,
    status: "At Risk",
    location: "Pescador Island",
    lastReport: "5 hrs ago",
    bleach: 38,
    coverage: 48,
    threat: "Thermal stress",
    lat: 9.8667,
    lng: 123.3667,
    depth: "3–40m",
    source: "static-fallback",
  },
  {
    id: "static-3",
    name: "Malapascua Shoal",
    score: 31,
    status: "Critical",
    location: "Malapascua Island",
    lastReport: "1 day ago",
    bleach: 71,
    coverage: 22,
    threat: "Bleaching event",
    lat: 11.3333,
    lng: 124.1167,
    depth: "10–30m",
    source: "static-fallback",
  },
];

function timeAgoFromIso(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (!Number.isFinite(diff) || diff < 0) return "recently";
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function normalizeReports(reports = []) {
  return reports.map((r, idx) => {
    const location = r.location || "Other / Unknown";
    const site = findCebuSiteByLocation(location);
    return {
      id: r.id || `report-${idx}`,
      name: site?.name || location,
      score: Number.isFinite(r.health_score) ? r.health_score : 0,
      status: r.status || "At Risk",
      location,
      lastReport: timeAgoFromIso(r.reported_at),
      bleach: Number.isFinite(r.bleaching_percent) ? r.bleaching_percent : 0,
      coverage: Number.isFinite(r.coral_coverage) ? r.coral_coverage : 0,
      threat: r.main_threat || "Unknown",
      lat: site?.lat ?? 10.3157,
      lng: site?.lng ?? 123.8854,
      depth: "N/A",
      source: r.source || "coralguard-report",
    };
  });
}

export async function loadUnifiedReefFeed(limit = 20) {
  const reports = await getReports(limit);
  if (Array.isArray(reports) && reports.length > 0) {
    return {
      reefs: normalizeReports(reports),
      sourceLabel: "Source: CoralGuard reports (Supabase/local)",
      sourceType: "reports",
      dataNote: "Measured from submitted/recorded CoralGuard reports.",
    };
  }

  try {
    const marine = await fetchCebuThermalReports(Math.min(limit, 7));
    return {
      reefs: marine.map((r) => ({ ...r, depth: "N/A" })),
      sourceLabel: `Source: ${CEBU_THERMAL_DATASET_INFO.provider} (${CEBU_THERMAL_DATASET_INFO.variables.join(", ")})`,
      sourceType: "open-meteo-marine",
      dataNote:
        "Thermal Risk Estimate only (SST-based), not a direct field-verified reef health survey.",
    };
  } catch (error) {
    console.warn("Unified reef feed fallback to static dataset:", error);
    return {
      reefs: STATIC_REEFS,
      sourceLabel: "Source: Local fallback dataset",
      sourceType: "static-fallback",
      dataNote: "Fallback demo data while live sources are unavailable.",
    };
  }
}
