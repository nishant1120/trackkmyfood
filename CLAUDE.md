# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NutriTrack: Expo Router app (web + iOS + Android) for calorie/nutrition tracking aimed at Indian users. Supabase (Postgres + RLS + magic-link auth), TanStack Query, Zustand, NativeWind v4, Google Gemini for AI food parsing. README.md has setup steps; DESIGN.md is the Spotify-inspired visual spec the UI follows.

## Commands

```bash
npm install
npx expo start            # dev server; press w / i / a for web / iOS / Android
npm run web|ios|android   # open a specific target directly
npm run lint              # expo lint (eslint-config-expo flat config)
npx tsc --noEmit          # typecheck (strict mode; no npm script for this)
npm run build:web         # static export to dist/ (what Vercel runs)

# Database (one-time / on new migration)
supabase link --project-ref <ref>
supabase db push --include-all --yes

# Food DB seeding (needs SUPABASE_SERVICE_ROLE_KEY + USDA_API_KEY in .env.local)
npm run seed              # IFCT + USDA + Open Food Facts; idempotent
npm run seed:dry          # fetch + normalize, no insert
npx tsx scripts/seed-foods.ts --only-ifct   # or --only-usda / --only-off
npm run seed:test-logs    # sample food logs for the dev user

# Native builds
eas build --profile preview|production --platform all
```

There is no test suite. Verify changes with `npx tsc --noEmit`, `npm run lint`, and running the app.

Env vars live in `.env.local` (gitignored; template in `.env.example`). `EXPO_PUBLIC_*` vars are inlined at bundle time, so restart the dev server after changing them. `eas.json` bakes only the Supabase URL and anon key into each build profile. `EXPO_PUBLIC_GEMINI_API_KEY` must never be committed: locally it comes from `.env.local`, on Vercel from the project's environment variables, and for EAS builds from `eas env:create`. A previous key committed in `eas.json` was auto-revoked by Google as leaked.

## Architecture

### Routing and the auth gate
`app/_layout.tsx` wraps everything in `AuthGate`, which owns all top-level redirects: no session → `(auth)/sign-in`; session but no `profiles` row → `(onboarding)/profile-setup`; otherwise → `(tabs)`. It also handles the native deep link `nutritrack://verify?code=` by exchanging the PKCE code. Don't add redirect logic elsewhere; add it here.

Route groups: `(auth)`, `(onboarding)`, `(tabs)` (Home/Log/History/Settings), `log/` (stack: search, ai-text, camera, barcode, templates, confirm screens), `settings/`. Typed routes are enabled.

Auth is magic-link only in production. On native it's PKCE + deep link; on web Supabase detects the session from the URL hash. A `__DEV__`-gated password sign-in exists on the sign-in screen for testing (prefilled from `EXPO_PUBLIC_DEV_EMAIL/PASSWORD`).

### Data layer: hooks/ + Supabase
All reads and writes go through TanStack Query hooks in `hooks/`, each calling `supabase` directly (no API layer, no edge functions). Conventions:
- Get `userId` from `useAuthStore((s) => s.user?.id)`, gate queries with `enabled: !!userId`, and put `userId` in the query key.
- Nutrition values are snapshotted onto each `food_logs` row (calories, macros, micros) so history never changes if a food is edited. AI-parsed items have `food_id: null` and their details in `ai_food_data` JSON.
- After any log mutation, invalidate `['daily-totals', userId]`, `['streak', userId]`, and `['insights', userId]` with `refetchType: 'all'` (see `invalidateLogs` in `hooks/useFoodLogs.ts`). Inactive dashboard queries won't refresh otherwise.
- `useDailyTotals` buckets by the user's local day and computes totals client-side.
- `useInsights` checks `ai_insights` for a row younger than 6h before calling Gemini; the UI shows a "cached" badge when it reuses one.

Schema and RLS are in `supabase/migrations/`. Every user-owned table has `auth.uid() = user_id` policies. `foods` is read-only to the app; only the seed script (service role) writes to it. `lib/types.ts` mirrors the tables by hand; update it when a migration changes a column.

### Stores (Zustand)
- `authStore`: session + `onAuthStateChange` listener; `initialize()` is called once from the root layout.
- `aiParseStore`: a set/take handoff mailbox between log screens (parsed items → `ai-confirm`, captured photo → `photo-confirm`, off-DB barcode food → `confirm`). Exists to keep base64 images and large payloads out of route params. `take()` clears on read.
- `themeStore`: persists via AsyncStorage manually. Do not use `zustand/middleware` (its bundle references `import.meta.env`, which breaks the Metro web build).

### LLM
`lib/llm.ts` is the only Gemini entry point. Model is pinned to `gemini-2.5-flash-lite` (1000 req/day free tier, immediate JSON output). Every call returns a tagged `LLMResult<T>` (`ok` or `error.kind` of `no_api_key | rate_limit | parse | network | unknown`); callers branch on `kind` for UI states rather than catching. Prompts, brand voice, and response shapes live in `lib/prompts.ts`.

### Platform differences
- `lib/supabase.ts` uses AsyncStorage on native (SecureStore's 2KB limit is too small for sessions) and falls back to a placeholder client when env vars are missing so `expo export` doesn't crash at build time.
- Platform-specific components use the `.web.tsx` suffix (e.g. `components/log/WebBarcodeScanner.web.tsx` uses ZXing; the native file is the expo-camera path).
- `lib/haptics.ts` is a web no-op; use it instead of calling expo-haptics directly.
- Sentry is opt-in via `EXPO_PUBLIC_SENTRY_DSN`; `reportError` from `lib/sentry.ts` is safe to call when disabled.

### Styling
NativeWind v4 with custom tokens in `tailwind.config.js`: surfaces `bg-bg`, `bg-bg-card`, `bg-bg-elevated`; text `text-fg`, `text-fg-muted`, `text-fg-dim`; brand `brand` (#1DB954); per-macro colors `macro-protein|carbs|fats|fibre`; `rounded-pill`, `rounded-card`. Shared primitives are in `components/ui/` (import from `@/components/ui`). Navigator options (tab bar, headers) can't take `className`, so those use the same hex values inline. Path alias `@/*` maps to the repo root.

### Nutrition math
`lib/nutrition.ts` holds BMR (Mifflin-St Jeor), TDEE multipliers, and the 25/45/30 macro split used to auto-fill goals during onboarding. The SQL `calculate_bmr` function in the migrations duplicates the BMR formula; keep them in sync if either changes.
