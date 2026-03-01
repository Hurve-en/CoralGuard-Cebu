import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── REEF REPORTS ──────────────────────────────────────────────────────────────

export async function submitReport(reportData, imageFile) {
  try {
    // 1. Upload image to Supabase Storage
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("reef-photos")
      .upload(fileName, imageFile);

    if (uploadError) throw uploadError;

    // 2. Get public URL of uploaded image
    const { data: urlData } = supabase.storage
      .from("reef-photos")
      .getPublicUrl(fileName);

    // 3. Save report to database
    const { data, error } = await supabase
      .from("reef_reports")
      .insert([
        {
          location: reportData.location,
          health_score: reportData.healthScore,
          status: reportData.status,
          bleaching_percent: reportData.bleachingPercent,
          coral_coverage: reportData.coralCoverage,
          water_clarity: reportData.waterClarity,
          main_threat: reportData.mainThreat,
          species: reportData.species,
          recommendation: reportData.recommendation,
          urgency: reportData.urgency,
          image_url: urlData.publicUrl,
          reported_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Submit report error:", error);
    return { success: false, error };
  }
}

export async function getReports(limit = 20) {
  const { data, error } = await supabase
    .from("reef_reports")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get reports error:", error);
    return [];
  }
  return data;
}

export async function getReportsByLocation(location) {
  const { data, error } = await supabase
    .from("reef_reports")
    .select("*")
    .eq("location", location)
    .order("reported_at", { ascending: false });

  if (error) {
    console.error("Get reports by location error:", error);
    return [];
  }
  return data;
}
