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

// ───────────────────────────────────────────────────────────────────
// Food text parsing
// ───────────────────────────────────────────────────────────────────

export type ParsedFoodItem = {
  name: string;
  name_hindi: string | null;
  quantity: number;
  unit: 'g' | 'ml' | 'cup' | 'piece' | 'serving';
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
  confidence: 'high' | 'medium' | 'low';
};

export type ParseFoodResponse = {
  items: ParsedFoodItem[];
  notes: string;
};

// Vision prompt is paired with an image part in the Gemini call. Returns
// the same shape as buildFoodParsePrompt so we can reuse the confirm UI.
export const FOOD_PHOTO_PROMPT = `This is a photo of a meal eaten by an Indian user. Identify each visible
food item, estimate quantity from visual cues (plate size, hand reference if
visible, typical serving size for that dish), and return JSON.

Return JSON in this exact shape — no prose, no markdown fences:
{
  "items": [
    {
      "name": "string (English, lowercase, e.g. 'roti', 'dal tadka')",
      "name_hindi": "string or null",
      "quantity": number,
      "unit": "g" | "ml" | "cup" | "piece" | "serving",
      "calories_kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "fibre_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "string — anything the user should verify (e.g. portion size guess), max 30 words."
}

Rules:
- One item per distinct visible food.
- Estimate per-quantity nutrition (not per 100g).
- Use Indian portion conventions: 1 katori≈150g, 1 roti≈40g, 1 plate poha≈200g, 1 glass milk/juice≈250ml, 1 bowl rice≈200g.
- "confidence: low" if the photo is blurry or the item is ambiguous.
- If the photo is unclear or has no food, return: {"items": [], "notes": "Photo unclear, please retake or use search."}.
- Numbers must be plain (no strings, no ranges).
`;

export function buildFoodParsePrompt(userInput: string): string {
  return `User typed: ${JSON.stringify(userInput)}

Extract every distinct food item with its quantity. For each item, estimate
nutrition for the QUANTITY STATED (not per 100g — multiply if needed). Use
IFCT 2017 values for Indian foods where possible.

Return JSON in this exact shape — no prose, no markdown fences:
{
  "items": [
    {
      "name": "string (English, lowercase, e.g. 'roti', 'dal tadka')",
      "name_hindi": "string or null",
      "quantity": number,
      "unit": "g" | "ml" | "cup" | "piece" | "serving",
      "calories_kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "fibre_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "string — any clarification the user should verify, max 30 words. Empty string if none."
}

Rules:
- One item per distinct food (don't merge "rice and dal" into one row).
- "katori" of dal/sabzi ≈ 150g. "1 roti/chapati" ≈ 40g. "1 piece poha plate" ≈ 200g.
- "1 glass milk" ≈ 250ml. "1 cup tea" ≈ 150ml.
- If the input has no food (empty/garbage/non-food), return {"items": [], "notes": "I didn't recognize any food in that input. Try '2 rotis, 1 katori dal'."}
- "confidence: low" for unusual or ambiguous foods you had to estimate heavily.
- Use unit "g" or "ml" by default. Use "piece" only when the food is naturally counted (e.g. "1 banana", "1 boiled egg"). Use "cup"/"serving" sparingly.
- Numbers must be plain (no strings, no ranges).
`;
}
