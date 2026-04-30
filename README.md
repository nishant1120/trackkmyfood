# NutriTrack

Cross-platform calorie + nutrition tracking for the Indian market. Spotify-inspired dark UI, AI-powered logging via Google Gemini, and ~2,000 seeded foods (IFCT 2017 + USDA FoodData Central + Open Food Facts).

Built on Expo Router (web + iOS + Android), Supabase (Postgres + RLS + Auth), TanStack Query, NativeWind, and Zustand.

---

## Quick start

1. **Install deps**
   ```bash
   npm install
   ```

2. **Set environment variables** in `.env.local` (gitignored):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   EXPO_PUBLIC_GEMINI_API_KEY=<from_aistudio.google.com>
   SUPABASE_SERVICE_ROLE_KEY=<from_dashboard_settings_api>
   USDA_API_KEY=<from_fdc.nal.usda.gov> # optional, for seeding
   EXPO_PUBLIC_SENTRY_DSN=             # optional, for error tracking
   ```

3. **Apply database migrations** (one-time):
   ```bash
   export SUPABASE_ACCESS_TOKEN=<sbp_... from supabase.com/dashboard/account/tokens>
   supabase link --project-ref <project-ref>
   supabase db push --include-all --yes
   ```

4. **Seed foods** (one-time, ~3 minutes):
   ```bash
   npm run seed
   ```
   Pulls IFCT 2017 (~528 Indian foods), USDA Foundation/SR Legacy (~1000 generic foods), and Open Food Facts India-tagged products (~500). Idempotent — re-runs only insert missing rows.

5. **Run the dev server**:
   ```bash
   npx expo start
   ```
   - Press `w` to open web at http://localhost:8081
   - Press `i` for iOS simulator (Mac only)
   - Press `a` for Android emulator
   - Scan the QR with Expo Go on a physical device

---

## Architecture

```
app/                       Expo Router routes (file-based)
├── (auth)/                Sign-in + magic-link verify
├── (onboarding)/          Multi-step profile setup
├── (tabs)/                Bottom-tab pages (Home / Log / History / Settings)
├── log/                   Log entry stack (search, AI text, camera, barcode, templates)
└── settings/              Profile editing + about

components/
├── ui/                    Spotify-styled primitives (Button, Card, Input, ...)
├── dashboard/             MacroRing, MacroBar, WaterTracker, BMICard, ...
├── charts/                StreakHeatmap, WeeklyCaloriesChart, ...
└── log/                   WebBarcodeScanner (platform-split via .web.tsx)

lib/
├── supabase.ts            Supabase client with platform-aware storage
├── llm.ts                 Gemini wrapper (text + vision, JSON mode)
├── prompts.ts             Brand-voice prompts + structured output schemas
├── nutrition.ts           BMR / TDEE / macros / BMI math
├── openfoodfacts.ts       Live OFF barcode lookup
├── notifications.ts       expo-notifications meal-reminder scheduler
├── haptics.ts             expo-haptics wrapper, web no-op
└── sentry.ts              Optional Sentry init

hooks/                     TanStack Query hooks
├── useProfile, useDailyTotals, useStreak, useTrends
├── useFoods, useFoodLogs, useWaterLogs, useWeightLogs
├── useTemplates, useInsights

stores/                    Zustand stores
├── authStore.ts           Session + onAuthStateChange listener
├── themeStore.ts          Persisted theme preference
└── aiParseStore.ts        One-shot handoffs for ai-text/vision/template flows

scripts/
├── seed-foods.ts          Food DB seeder (IFCT + USDA + OFF)
├── seed-test-logs.ts      Optional: seed a few sample food logs
└── seed/                  Per-source normalizers

supabase/migrations/       SQL migrations (applied via `supabase db push`)
```

### Auth model
- Magic-link email auth via Supabase. PKCE on native (deep link `nutritrack://verify`), implicit hash flow on web.
- Dev-only password sign-in via `__DEV__`-gated UI on the sign-in screen, useful for testing without burning email rate limits.
- Row-Level Security on every user-owned table (`profiles`, `food_logs`, `water_logs`, `weight_logs`, `meal_templates`, `ai_insights`). Foods are read-only for authenticated users; only the seed script (service role) writes.

### LLM model
- Single Gemini wrapper (`lib/llm.ts`) using `gemini-2.5-flash-lite` for both text parsing and vision. Returns a tagged result so UI can show specific error states (rate limit, parse error, network).
- Insights are cached for 6 hours per user in `ai_insights`. UI shows a "cached" badge when reused.

---

## Build & deploy

### Web (Vercel)
```bash
npm run build:web      # outputs to dist/
vercel --prod          # uses vercel.json
```
Set the same `EXPO_PUBLIC_*` vars in the Vercel project dashboard.

### Native (EAS Build)
```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform all   # internal preview
eas build --profile production --platform all
```
Profiles defined in `eas.json`. Bundle IDs come from `app.json` (`com.nutritrack.app`).

---

## Useful scripts

| Command | What it does |
|---|---|
| `npm run start` | Expo dev server (interactive picker for platform) |
| `npm run web` / `ios` / `android` | Open a specific target |
| `npm run build:web` | Static web export to `dist/` |
| `npm run seed` | Seed foods table from IFCT + USDA + OFF |
| `npm run seed:dry` | Same, but don't insert (sanity test) |
| `npm run seed:test-logs` | Seed a few mock food logs for the dev test user |
| `npm run lint` | Expo lint |

Source-specific seeding: `npx tsx scripts/seed-foods.ts --only-ifct` (or `--only-usda` / `--only-off`).

---

## Things to know

- **Web cameras vary**. Barcode scanning on web uses ZXing (`@zxing/browser`); detection quality depends on the user's webcam. Manual barcode entry is always available.
- **Free Gemini quota** is 1000 requests/day on `gemini-2.5-flash-lite`. Insights regenerate every 6h; AI text + vision parses are 1 request each.
- **OFF can be flaky**. Re-running the seeder is safe — already-inserted rows are skipped.
- **Light mode** ships as a saved preference; full visual application is on the polish backlog.
- **Photos aren't persisted**. Camera captures go to Gemini and are dropped. Adding Supabase Storage for meal photos is a future feature.

---

## License

Private project, not for redistribution.
