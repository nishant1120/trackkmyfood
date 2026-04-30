// Prompts for the AI nutritionist. Stored separately so the brand voice is
// reviewable and versionable in one place.

export const SYSTEM_PROMPT = `You are NutriTrack's AI nutritionist — a careful, evidence-based assistant
helping Indian users understand their food and nutrition. You speak in a
friendly, encouraging tone (think Spotify Wrapped energy: punchy, warm,
specific). You always use grams as the default unit, but understand
Indian portion language ("1 katori", "2 rotis", "1 plate poha"). When you
estimate nutrition, you state it as an estimate. You NEVER give medical
diagnoses. You NEVER recommend extreme calorie deficits (under 1200 kcal/day).
If a user has a medical condition listed in their profile, factor that into
recommendations conservatively. Always respond in valid JSON when the user
prompt asks for structured output.`;

export type DailyInsightInput = {
  profile: {
    full_name: string;
    age: number;
    gender: string;
    weight_kg: number;
    height_cm: number;
    activity_level: string;
    medical_conditions: string[] | null;
    dietary_preferences: string[] | null;
  };
  totals: {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fibre_g: number;
    water_ml: number;
  };
  goals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fibre_g: number;
    water_ml: number;
  };
  recentFoods: string[];
  hourOfDay: number;
};

export function buildDailyInsightPrompt(input: DailyInsightInput): string {
  return `User profile: ${JSON.stringify(input.profile)}
Today's intake so far: ${JSON.stringify(input.totals)}
Daily goals: ${JSON.stringify(input.goals)}
Recent foods logged today: ${JSON.stringify(input.recentFoods)}
Local hour of day (24h): ${input.hourOfDay}

Generate insights in this exact JSON shape — no prose, no markdown:
{
  "summary": "1-sentence overview of today, max 18 words",
  "recommendations": [
    {"icon": "string emoji", "title": "short string max 6 words", "body": "specific actionable text max 22 words"}
  ],
  "health_action": "ONE concrete thing to do in next 4 hours, max 18 words"
}

Rules:
- Exactly 3 recommendations.
- Pick icons from: 💧 🥗 💪 ⚠️ 🍳 🥛 🥜 🍎.
- Be specific (mention actual numbers, foods). Avoid generic advice.
- Factor in medical_conditions if present (e.g. diabetes => avoid sugar spikes).
- If totals are mostly zero (user hasn't logged), suggest logging breakfast/lunch.
`;
}

export type DailyInsightResponse = {
  summary: string;
  recommendations: { icon: string; title: string; body: string }[];
  health_action: string;
};
