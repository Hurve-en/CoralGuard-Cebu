const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

export async function analyzeCoralImage(base64Image, mimeType, location) {
  const prompt = `You are CoralGuard AI, an expert marine biologist analyzing coral reef health for Cebu, Philippines.

Analyze this underwater image and respond ONLY in valid JSON with no markdown, no explanation:
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
If no underwater or coral image is visible, return healthScore 0 and status "Invalid Image".
Location context: ${location || "Cebu, Philippines"}`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
    }),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function chatWithReefBot(history, userMessage) {
  const systemContext = `You are ReefBot, the AI assistant for CoralGuard Cebu — an app that monitors and protects coral reefs in Cebu, Philippines.
You help fisherfolk, divers, LGU officials, and community members understand reef health, report damage, and learn how to protect reefs.
You speak both English and Cebuano (Bisaya). If the user writes in Cebuano, reply in Cebuano. Otherwise reply in English.
Keep responses concise, warm, and expert.
Focus on Cebu reefs: Moalboal, Malapascua, Mactan, Olango, Pescador, Bantayan, Camotes.`;

  const contents = [
    {
      role: "user",
      parts: [
        { text: systemContext + "\n\nStart the conversation as ReefBot." },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "Kumusta! I'm ReefBot, your AI guide for Cebu's coral reefs. Ask me anything in English or Cebuano! 🪸",
        },
      ],
    },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text || "Pasensya na, try again!"
  );
}
