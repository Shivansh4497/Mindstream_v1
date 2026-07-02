Phase 1 complete. I only inspected repository topology, manifests, import surfaces, config filenames, and schema object names. I did not review business logic, prompts, or feature internals.

**Observed Architecture**
Mindstream is a single-repo TypeScript React app built with Vite.

The main shape appears to be:

- Browser client: React 19 + Vite, mounted from [index.tsx](/Users/director/Desktop/Mindstream_v1/index.tsx)
- App shell: [App.tsx](/Users/director/Desktop/Mindstream_v1/App.tsx) gates auth, then renders [MindstreamApp.tsx](/Users/director/Desktop/Mindstream_v1/MindstreamApp.tsx)
- Backend/data platform: Supabase client, SQL schema/migrations, and Supabase Edge Functions
- AI layer: Gemini-facing client/service modules plus Supabase Edge Function proxy
- Tests: Vitest + happy-dom under [__tests__](/Users/director/Desktop/Mindstream_v1/__tests__)
- Local scripts: diagnostics, RAG evaluation, backfills, audits, proxy tests

**Entry Points**
- [index.html](/Users/director/Desktop/Mindstream_v1/index.html): Vite HTML entry, loads Tailwind CDN, Google Fonts, and `/index.tsx`.
- [index.tsx](/Users/director/Desktop/Mindstream_v1/index.tsx): React root, Sentry import, auth provider, config checks, global error boundary.
- [App.tsx](/Users/director/Desktop/Mindstream_v1/App.tsx): auth-level switch between login and app.
- [MindstreamApp.tsx](/Users/director/Desktop/Mindstream_v1/MindstreamApp.tsx): primary product shell; imports navigation, major views, modals, hooks, DB services, AI services.

**Main Modules**
- [components](/Users/director/Desktop/Mindstream_v1/components): UI layer. Depends mostly on React, framer-motion, lucide-react, local `types`, `utils`, `services`, and `styles`.
- [hooks](/Users/director/Desktop/Mindstream_v1/hooks): application state/orchestration hooks. `useAppLogic` appears to be the central client-side coordinator, depending on auth, DB, AI, nudges, extraction, correlation, profile, chat session, and Supabase.
- [services](/Users/director/Desktop/Mindstream_v1/services): data, AI, analysis, export, parsing, and orchestration service layer. Depends on Supabase, Gemini proxy/client modules, shared types, and utilities.
- [context](/Users/director/Desktop/Mindstream_v1/context): React context for authentication. Depends on Supabase auth and DB profile access.
- [utils](/Users/director/Desktop/Mindstream_v1/utils): client utilities for date handling, streaks, ETA calculation, haptics, TTS, speech recognition, and celebrations.
- [types.ts](/Users/director/Desktop/Mindstream_v1/types.ts): shared domain types used across UI, hooks, and services.
- [config](/Users/director/Desktop/Mindstream_v1/config): static configuration for AI personalities and commitment-language labels/signals.

**Feature Modules**
Observed from filenames/imports, not implementation:

- Stream/journal: `Stream`, `EntryCard`, `EditEntryModal`, `EntryTypeModal`, `EmptyStreamState`
- Chat: `ChatView`, `ChatInputBar`, `MessageBubble`, `ChatSharingModal`, `useChatSession`, `useChatSeed`
- Habits: `HabitsView`, `HabitCard`, `HabitGrid`, `HabitHeatmap`, `HabitLogButton`, `HabitDetailPopup`, `EditHabitModal`
- Intentions: `IntentionsView`, `IntentionCard`, `IntentionsInputBar`, `ETASelector`, `EditIntentionModal`
- Reflections/insights: `ReflectionsView`, `DailyReflections`, `WeeklyReflections`, `MonthlyReflections`, `ReflectionCard`, `InsightCard`, `InsightsView`, `InsightModal`
- Life/focus dashboards: `LifeView`, `FocusView`, `LifeAreaDashboard`, `CorrelationDashboard`, `SentimentTimeline`
- Onboarding/demo/FTUE: `LandingScreen`, `OnboardingWizard`, `FTUETour`, `DemoWelcomeModal`, `DemoLimitModal`, `useDemoMode`, `useFTUE`
- Settings/export/debug: `SettingsView`, `PersonalitySelector`, `PrivacyModal`, `InsightValidator`, `dataExportService`

**AI-Related Modules**
- [services/geminiClient.ts](/Users/director/Desktop/Mindstream_v1/services/geminiClient.ts): central AI proxy/client boundary; depends on Supabase.
- [services/geminiService.ts](/Users/director/Desktop/Mindstream_v1/services/geminiService.ts): higher-level AI service; depends on Gemini client, personality config, temporal parser, query classifier, DB, Supabase.
- [services/extractionService.ts](/Users/director/Desktop/Mindstream_v1/services/extractionService.ts): extraction pipeline boundary; depends on Gemini client and commitment-language config.
- [services/reflectionService.ts](/Users/director/Desktop/Mindstream_v1/services/reflectionService.ts): reflection generation boundary; depends on Gemini client.
- [services/queryClassifier.ts](/Users/director/Desktop/Mindstream_v1/services/queryClassifier.ts): query classification; depends on Supabase, temporal parser, Gemini client.
- [services/profileEngine.ts](/Users/director/Desktop/Mindstream_v1/services/profileEngine.ts): profile/coach memory engine; depends on Gemini client and DB.
- [services/correlationEngine.ts](/Users/director/Desktop/Mindstream_v1/services/correlationEngine.ts): AI-assisted correlation layer; depends on Gemini client and DB.
- [services/chartInsightsService.ts](/Users/director/Desktop/Mindstream_v1/services/chartInsightsService.ts), [services/yearlyReviewService.ts](/Users/director/Desktop/Mindstream_v1/services/yearlyReviewService.ts), [services/onboardingSuggestions.ts](/Users/director/Desktop/Mindstream_v1/services/onboardingSuggestions.ts): AI-adjacent feature services.
- [supabase/functions/ai-proxy](/Users/director/Desktop/Mindstream_v1/supabase/functions/ai-proxy): Deno Edge Function proxy, with an embedding service.
- [scripts/rag-eval.ts](/Users/director/Desktop/Mindstream_v1/scripts/rag-eval.ts), [scripts/ragDiagnostic.ts](/Users/director/Desktop/Mindstream_v1/scripts/ragDiagnostic.ts), [scripts/backfillEmbeddings.ts](/Users/director/Desktop/Mindstream_v1/scripts/backfillEmbeddings.ts): RAG/vector diagnostic and backfill tooling.
- [prompts.md](/Users/director/Desktop/Mindstream_v1/prompts.md): prompt documentation exists, intentionally not inspected.

**Authentication Modules**
- [context/AuthContext.tsx](/Users/director/Desktop/Mindstream_v1/context/AuthContext.tsx): auth state/provider; depends on Supabase auth, shared profile type, DB service.
- [components/Login.tsx](/Users/director/Desktop/Mindstream_v1/components/Login.tsx): login UI; depends on auth context and Google icon.
- [services/supabaseClient.ts](/Users/director/Desktop/Mindstream_v1/services/supabaseClient.ts): Supabase client/config boundary.
- Database tables/policies include `profiles`, `user_preferences`, and RLS policies for user-owned data.

**Database Modules**
- [schema.sql](/Users/director/Desktop/Mindstream_v1/schema.sql): base schema. Observed tables include `profiles`, `entries`, `reflections`, `habits`, `habit_logs`, `intentions`, `insight_cards`, `chart_insights`, `analytics_events`, `user_preferences`, `proactive_nudges`.
- [supabase/migrations](/Users/director/Desktop/Mindstream_v1/supabase/migrations): incremental schema changes for chart insights, personalities, nudges, analytics, chat feedback/sessions, correlation insights, coach memory, vector search, temporal filtering, demo mode, user profiles, habit soft delete/change tracking.
- [services/dbService.ts](/Users/director/Desktop/Mindstream_v1/services/dbService.ts): main client-side database access layer.
- Vector/RAG objects observed: `vector` extension, `entries.embedding`, `match_entries(...)`.

**Shared Libraries / Styling**
- [styles](/Users/director/Desktop/Mindstream_v1/styles): glass UI styling and hover effects.
- [components/icons](/Users/director/Desktop/Mindstream_v1/components/icons): local icon components, alongside `lucide-react`.
- [components/illustrations](/Users/director/Desktop/Mindstream_v1/components/illustrations): empty-state illustrations.
- [public](/Users/director/Desktop/Mindstream_v1/public): app icon and Mindstream logo.

**Configuration / Build**
- [package.json](/Users/director/Desktop/Mindstream_v1/package.json): npm scripts are `dev`, `build`, `preview`, `test`, and `eval:rag`.
- [vite.config.ts](/Users/director/Desktop/Mindstream_v1/vite.config.ts): Vite React, dev server on port `3000`, alias `@` to repo root, Gemini env values exposed via `process.env.*`.
- [tsconfig.json](/Users/director/Desktop/Mindstream_v1/tsconfig.json): TypeScript with bundler resolution, React JSX, `allowJs`, no emit.
- [vitest.config.ts](/Users/director/Desktop/Mindstream_v1/vitest.config.ts): Vitest with happy-dom and setup mocks.
- [.env.example](/Users/director/Desktop/Mindstream_v1/.env.example): declares Supabase URL/key and Gemini key; OpenAI key mentioned for insight evaluation UI.

**Deployment / Runtime Setup**
- No Dockerfile, docker-compose, Vercel config, Netlify config, or CI config observed in this pass.
- Supabase Edge Functions are present under [supabase/functions](/Users/director/Desktop/Mindstream_v1/supabase/functions), using Deno import maps.
- [README.md](/Users/director/Desktop/Mindstream_v1/README.md) describes a local AI Studio-originated app flow: install dependencies, set Gemini key, run Vite dev server.
- `dist/` exists, indicating a previous Vite build artifact is checked into the working tree or present locally.

**Third-Party Services / Libraries**
Observed dependencies:
- Supabase: auth, database, edge functions, RLS, vector search
- Gemini / Google GenAI: `@google/genai`, Gemini env key, AI proxy/client modules
- Sentry: imported at app root
- React / React DOM
- Vite / TypeScript
- Framer Motion
- lucide-react
- Recharts
- date-fns
- react-markdown / remark-gfm
- canvas-confetti
- `@xenova/transformers`: likely local embeddings or model tooling, but usage not confirmed in Phase 1
- Playwright dependency present, though no Playwright test structure confirmed

**Reasonable Inferences**
- This is primarily a client-heavy React app with Supabase as the backend platform.
- Supabase Edge Functions likely protect or centralize AI calls and background AI jobs.
- `useAppLogic` appears to be the client-side orchestration hub.
- `dbService` appears to be the primary persistence abstraction.
- The data model centers around user-owned entries, habits, intentions, reflections, insights, chat sessions/feedback, nudges, analytics, and profile/memory data.

**Unknowns**
- Exact runtime deployment target beyond local Vite + Supabase is not established.
- Whether `dist/` is intentionally versioned or just local output is unknown.
- Whether Edge Functions are scheduled, manually invoked, or triggered by the client is unknown.
- Whether AI calls happen exclusively through `ai-proxy` is not yet proven.
- The authoritative current schema may be split between `schema.sql` and migrations; precedence needs confirmation.
- The role of root-level scratch/test/rewrite scripts is unclear.
- The actual prompt orchestration and RAG design were intentionally not inspected.

**Questions**
1. Is Supabase the intended production backend, or is it still a prototype backend?
2. Is deployment currently manual, AI Studio-based, Supabase-hosted, or through another host not represented in the repo?
3. Should `schema.sql` be treated as canonical, or are migrations the source of truth?
4. Are root-level diagnostic/rewrite scripts active tooling or historical artifacts?
5. Should `dist/` be considered part of the repo contract or ignored as generated output?

**Recommended Phase 2 Inspection Plan**
Phase 2 should inspect **Application Flow and State Ownership**, still avoiding deep business logic.

Suggested scope:
1. Trace startup/auth flow: `index.tsx` → `App.tsx` → `AuthContext` → `MindstreamApp`.
2. Map `MindstreamApp` view routing and high-level state ownership.
3. Inspect `useAppLogic` as the orchestration hub at the function-boundary level.
4. Map which services each user flow touches, without reviewing prompts.
5. Produce a flow diagram of app state, auth state, DB state, and AI status.

todays date: 2026-07-03
latest commit id: 8a30b86a2b702c4790f42c9486f7e85b6d5a77eb
