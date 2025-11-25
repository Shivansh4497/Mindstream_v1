
# Product Requirement Document: Mindstream
**Version:** 2.0
**Date:** [Current Date]
**Status:** Production-Ready (Phase 3: Performance & Reliability Architecture Complete)
**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Supabase, Google Gemini API
**Author:** AI Assistant & Lead Engineer

---

## 1. Executive Summary & Vision

### 1.1. The Core Problem
Humans have a "Input/Output" disconnect. We feel things (Input) and we do things (Output), but we rarely understand the correlation between the two.
*   *Example:* "Why am I anxious?" (Feeling) -> "Because you haven't exercised in 3 days." (Doing).
*   Most apps track one or the other. Mindstream tracks both and uses AI to close the loop.

### 1.2. The Solution: "Your Second Brain for Clarity"
Mindstream is a private, local-first feeling AI companion that acts as a **Self-Correction Engine**. It captures scattered thoughts, tracks behavioral systems (habits), and synthesizes them into actionable insights using Retrieval Augmented Generation (RAG).

### 1.3. Core Value Proposition
1.  **Zero Friction:** Capture thoughts via text or voice in < 5 seconds.
2.  **Zero Latency:** Optimistic UI ensures the app feels instant, even on slow networks.
3.  **Contextual Intelligence:** The AI knows your history, habits, and goals, preventing generic advice.
4.  **Atmospheric Empathy:** The UI visually adapts (colors, gradients) to the user's emotional state.

---

## 2. User Persona

**"Alex, the Introspective Builder"**
*   **Profile:** 28-40 years old, Knowledge Worker / Creative.
*   **Psychographics:** High ambition, prone to burnout, values privacy, loves data but hates manual entry.
*   **Behaviors:**
    *   Already tries to journal but fails to be consistent ("Blank Page Paralysis").
    *   Has tried Habit Trackers (Streaks, Atomic Habits) but finds them too rigid.
    *   Wants to "debug" their own mind.

---

## 3. Product Architecture: The 5 Pillars

Mindstream is structured around 5 distinct pillars that feed into a central data lake.

### Pillar 1: The Stream (Input)
*   **Function:** A reverse-chronological feed of raw thoughts.
*   **Features:**
    *   **Voice-First Input:** Web Speech API integration for dictation.
    *   **Guided Prompts:** Context-aware chips (e.g., "Small win today...") to unblock users.
    *   **AI Enrichment:** Asynchronous tagging, titling, and sentiment analysis.
    *   **Safety:** "Graceful Degradation" allows saving even if AI is offline (tagged as "Unprocessed").

### Pillar 2: Habits (Behavior)
*   **Function:** Tracking the "Systems" that power the user's life.
*   **Features:**
    *   **AI Categorization:** Auto-sorts habits into 6 domains: *Health, Growth, Career, Finance, Connection, System*.
    *   **Frequency Logic:** Daily, Weekly, Monthly tracking logic.
    *   **Optimistic Toggling:** Instant visual feedback on check/uncheck.
    *   **Visuals:** Color-coded badges based on category (e.g., Health = Red/Rose).

### Pillar 3: Intentions (Goals)
*   **Function:** Tracking finite goals across timeframes.
*   **Features:**
    *   **Timeframes:** Daily, Weekly, Monthly, Yearly, Life.
    *   **Focus Mode:** "Today's Focus" banner in Stream shows pending Daily intentions.
    *   **AI Suggestions:** Reflections generate new actionable intentions automatically.

### Pillar 4: Reflections (Synthesis)
*   **Function:** The "Insight Engine" that connects inputs (Stream) with behaviors (Habits).
*   **Features:**
    *   **Daily/Weekly/Monthly:** Aggregates data to find patterns.
    *   **Thematic:** Ability to generate a reflection on a specific tag (e.g., "Deep Dive on 'Burnout'").
    *   **Context-Aware:** "You felt Anxious, which aligns with missing your Meditation habit."

### Pillar 5: Chat (Exploration)
*   **Function:** A conversational interface to "Talk to your Journal."
*   **Features:**
    *   **RAG Context:** Injects recent entries + pending intentions into the system prompt.
    *   **Seamless Handoff:** Accepts context from Onboarding to continue the session without amnesia.
    *   **Vertical Redundancy:** Falls back to lighter models if the primary model hangs.

---

## 4. The "Golden Path" Onboarding Flow

The onboarding is designed to deliver an **"Awe Moment"** (Instant Insight) within 60 seconds, bypassing the "Empty State" problem.

### Step 1: The Sanctuary
*   **UI:** Minimalist Lock Icon.
*   **Goal:** Establish privacy and trust.

### Step 2: The Spark (Sentiment)
*   **Action:** User selects a granular emotion (e.g., "Anxious", "Inspired").
*   **Visual:** **Atmospheric Immersion.** The background radial gradient shifts colors to match the mood (e.g., Deep Orange for Anxious, Bright Teal for Excited).

### Step 3: The Container (Life Area)
*   **Action:** User selects a domain (Work, Relationships, Health, Self, Money).

### Step 4: The Friction (Trigger)
*   **Action:** User selects a specific trigger based on the Area (e.g., Work -> "Imposter Syndrome").
*   **Logic:** This utilizes **"Context Stacking"** to build a high-fidelity prompt without the user writing a word.

### Step 5: Elaboration (The Drill-Down)
*   **UI:** Floating "Thought Bubbles" appear in the background (Context-aware: Positive examples for positive moods, negative for negative).
*   **Prompt:** Dynamic question generation.
    *   *Logic:* If Sentiment is Positive ("Grateful") + Trigger ("Self-Worth"), ask: "What reinforced your value today?"
    *   *Logic:* If Sentiment is Negative ("Anxious") + Trigger ("Self-Worth"), ask: "What is making you doubt your value?"
*   **Input:** Voice or Text.

### Step 6: The Awe Moment (Instant Insight)
*   **Process:** AI analyzes the Stack (Sentiment + Area + Trigger + Text).
*   **Output:** A "Typewriter Reveal" insight card that validates the feeling and offers a perspective shift.
*   **Handoff:** "Unpack this with AI" button leads directly to Chat, seeding the conversation with the specific context.

---

## 5. Technical Architecture: Performance & Reliability

To ensure a native-app feel on the web, we implement three critical architectural patterns.

### 5.1. Optimistic UI (Zero Latency)
*   **Concept:** The UI updates *immediately* upon user action, assuming the server request will succeed.
*   **Implementation:**
    *   **Habits:** Clicking a habit toggles the checkmark and updates the streak count instantly. A `ref` lock prevents race conditions on spam-clicking.
    *   **Stream:** Adding an entry injects a `temp-id` card into the list immediately.
    *   **Intentions:** Toggling status flips the UI state instantly.
*   **Rollback:** If the DB call fails, the state reverts and a Toast error appears.

### 5.2. Graceful Degradation (AI Safety Net)
*   **Concept:** The app must function as a "Dumb Journal" if the AI "Brain" is offline.
*   **Scenario A (Entry Creation):**
    *   *Normal:* User Text -> AI Analysis (Tags/Emoji) -> DB Save.
    *   *Failure Mode:* User Text -> AI Error -> **Fallback to Defaults** (Tag: "Unprocessed", Emoji: "📝") -> DB Save.
    *   *Result:* User data is never lost due to AI outages.
*   **Scenario B (Habit Creation):**
    *   *Failure Mode:* AI fails to categorize. Fallback to `Category: System`, `Emoji: ⚡️`.

### 5.3. Vertical Redundancy (Model Fallback)
*   **Concept:** Prevent 503/429 errors by falling back to lighter models.
*   **Implementation:** `services/geminiService.ts` -> `callWithFallback`
    *   **Primary:** `gemini-2.5-flash` (High Reasoning).
    *   **Backup:** `gemini-1.5-flash` (High Availability / Lower Latency).
*   **Logic:** If Primary throws a network error or rate limit, the request is immediately retried on Backup.

---

## 6. Data Model (Supabase Schema)

### `profiles`
*   `id` (uuid, PK): References `auth.users`.
*   `email` (text).
*   `avatar_url` (text).

### `entries`
*   `id` (uuid, PK).
*   `user_id` (uuid, FK).
*   `text` (text).
*   `timestamp` (timestamptz).
*   `title` (text, nullable).
*   `emoji` (text, nullable).
*   `tags` (text[], nullable).
*   `primary_sentiment` (text, nullable).
*   `secondary_sentiment` (text, nullable).

### `intentions`
*   `id` (uuid, PK).
*   `user_id` (uuid, FK).
*   `text` (text).
*   `status` ('pending' | 'completed').
*   `timeframe` ('daily' | 'weekly' | 'monthly' | 'yearly' | 'life').
*   `created_at` (timestamptz).
*   `completed_at` (timestamptz, nullable).

### `habits`
*   `id` (uuid, PK).
*   `user_id` (uuid, FK).
*   `name` (text).
*   `emoji` (text).
*   `category` ('Health' | 'Growth' | 'Career' | 'Finance' | 'Connection' | 'System').
*   `frequency` ('daily' | 'weekly' | 'monthly').
*   `current_streak` (int).
*   `longest_streak` (int).
*   `created_at` (timestamptz).

### `habit_logs`
*   `id` (uuid, PK).
*   `habit_id` (uuid, FK).
*   `completed_at` (timestamptz).

### `reflections`
*   `id` (uuid, PK).
*   `user_id` (uuid, FK).
*   `type` ('daily' | 'weekly' | 'monthly').
*   `date` (text): Stores 'YYYY-MM-DD' or 'YYYY-W22' or 'YYYY-MM'.
*   `summary` (text).
*   `suggestions` (jsonb): Array of AI suggested intentions.
*   `timestamp` (timestamptz).

---

## 7. AI System Prompts

### Persona
*   **Role:** "Expert Coach & Wise Friend."
*   **Tone:** Empathetic, non-judgmental, concise, encouraging.
*   **Format:** Always JSON structured for UI rendering.

### Key Prompts
1.  **`processEntry`:** Extracts Title (3-5 words), Tags (2-4), Sentiment (from fixed list), Emoji.
2.  **`generateInstantInsight` (Onboarding):** Uses "Context Stacking" (Trigger + Sentiment + Text) to provide a perspective shift, not just a summary.
3.  **`generateReflection`:** Synthesizes Entries + Intentions + Habit Logs to find correlations between feelings and actions.
4.  **`analyzeHabit`:** Classifies user text into one of the 6 fixed categories.

---

## 8. Future Roadmap

1.  **Visual Analytics:** Charts mapping "Sentiment Score" vs. "Habit Completion Rate" over time.
2.  **Calendar Integration:** Two-way sync for Intentions.
3.  **Proactive Notifications:** "You seem Anxious today. Want to reflect?" (Based on sentiment trends).
4.  **Offline Mode:** Full PWA support with local-first storage syncing when online.
