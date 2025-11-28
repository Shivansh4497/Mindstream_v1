# Product Requirement Document: Mindstream
**Version:** 4.0  
**Last Updated:** November 29, 2025  
**Status:** Production (Live on Vercel)  
**Repository:** [github.com/Shivansh4497/Mindstream_v1](https://github.com/Shivansh4497/Mindstream_v1)  
**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL + Auth), Google Gemini 2.5 Flash  
**Author:** Product Team

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Target User](#2-target-user)
3. [Core Value Proposition](#3-core-value-proposition)
4. [Product Architecture: The 6 Pillars](#4-product-architecture-the-6-pillars)
5. [User Flows](#5-user-flows)
6. [Technical Architecture](#6-technical-architecture)
7. [Database Schema](#7-database-schema)
8. [AI System](#8-ai-system)
9. [Security & Privacy](#9-security--privacy)
10. [Deployment & DevOps](#10-deployment--devops)
11. [Future Roadmap](#11-future-roadmap)

---

## 1. Executive Summary & Vision

### 1.1 The Core Problem

Humans experience an **"Input/Output" disconnect**:
- **Input:** Feelings, thoughts, moods
- **Output:** Actions, behaviors, systems

We feel things and do things, but **rarely understand the correlation** between them.

**Example:**  
*"Why am I anxious?"* → The answer might be: *"Because you haven't exercised in 3 days."*

Most apps track either inputs (journals) or outputs (habit trackers). Mindstream tracks **both** and uses AI to **close the loop**.

### 1.2 The Solution

**Mindstream: Your Second Brain for Clarity**

A private, AI-powered journaling companion that acts as a **Self-Correction Engine**. It:
- Captures scattered thoughts effortlessly (text + voice)
- Tracks behavioral systems (habits) and finite goals (intentions)
- Synthesizes patterns using AI + RAG (Retrieval Augmented Generation)
- Delivers actionable insights that connect feelings with behaviors
- **Adapts its personality** to match your preferred coaching style
- **Proactively detects patterns** and offers timely interventions
- **Generates yearly insights** to show long-term growth

### 1.3 Product Philosophy

1. **Privacy First:** Your data = Your vault. Complete data export available.
2. **Zero Friction:** Capture thoughts in <5 seconds.
3. **Zero Latency:** Optimistic UI makes the app feel instant.
4. **Contextual Intelligence:** AI knows your history, preventing generic advice.
5. **Graceful Degradation:** Works as a "dumb journal" even if AI fails.
6. **Personalization:** 5 distinct AI personalities to match your needs.

---

## 2. Target User

### Primary Persona: "Alex, the Introspective Builder"

**Demographics:**
- Age: 25-40
- Occupation: Knowledge worker, creative, entrepreneur
- Technical literacy: Medium to High

**Psychographics:**
- High ambition, prone to burnout
- Values privacy and data ownership
- Wants to "debug" their own mind
- Loves data but hates manual entry

**Current Pain Points:**
- Tried journaling but suffers from "Blank Page Paralysis"
- Used habit trackers (Streaks, Atomic Habits) but finds them too rigid
- Seeks self-awareness but lacks time/tools to connect the dots
- Wants personalized coaching, not one-size-fits-all advice

**What They Want:**
- A tool that learns their patterns
- Actionable insights, not platitudes
- Fast, beautiful, private
- An AI companion that matches their communication style

---

## 3. Core Value Proposition

### 3.1 For the User

| Feature | Benefit |
|---------|---------|
| **Voice-First Input** | Capture thoughts while walking, driving, or lying in bed |
| **AI Enrichment** | Auto-tags, titles, and analyzes sentiment without manual work |
| **Habit-Feeling Correlation** | "You felt anxious 3 days in a row. Coincides with skipping meditation." |
| **Conversational Exploration** | Ask your journal questions: "Why do I procrastinate?" |
| **5 AI Personalities (NEW!)** | Choose between Stoic, Empathetic, Tough Coach, Curious, or Cheerleader |
| **Proactive Nudges (NEW!)** | AI detects patterns and intervenes before issues escalate |
| **Life Area Dashboards (NEW!)** | View habits/intentions by domain (Health, Career, etc.) |
| **Yearly Review (NEW!)** | Beautiful "Spotify Wrapped" style annual summary |
| **Full Data Export (NEW!)** | Download your entire history in JSON or Markdown |
| **Voice Output (NEW!)** | AI can speak responses using Text-to-Speech |

### 3.2 Competitive Differentiation

| Competitor | What They Do | What Mindstream Does Better |
|------------|--------------|----------------------------|
| Notion/Obsidian | Manual note-taking | **AI auto-organizes + Personality adaptation** |
| Day One | Beautiful journal | **Connects feelings → actions + Proactive nudges** |
| Habitica/Streaks | Gamified habits | **Ties habits to emotional state + Long-term insights** |
| Therapist Apps | Generic CBT prompts | **Personalized via RAG context + 5 coaching styles** |
| Replika | AI companion | **Action-oriented + Data ownership + Zero vendor lock-in** |

---

## 4. Product Architecture: The 6 Pillars

Mindstream is structured around **6 interconnected pillars** feeding a central data lake.

### Pillar 1: **Stream** (Input Layer)

**Purpose:** Capture raw thoughts in a reverse-chronological feed.

**Features:**
- **Voice Dictation:** Web Speech API integration
- **Guided Prompts:** Contextual chips like *"Small win today..."* to unblock users
- **AI Enrichment:**
  - Auto-generates title (3-5 words)
  - Extracts 2-4 tags
  - Analyzes primary + secondary sentiment from 13 granular emotions
  - Assigns emoji
- **Entry Suggestions:** AI generates 3 actionable follow-ups (e.g., "Start a meditation habit")
- **Thematic Reflection:** Click any tag to generate an AI deep-dive on that theme
- **Proactive Nudges:** Subtle banners alert users to detected patterns

**UI Pattern:**
- Entries grouped by date (Today, Yesterday, Nov 19...)
- Each entry shows emoji, title, sentiment badge, tags
- Click to expand for full text + suggestions
- Nudge banner appears at top when patterns detected

---

### Pillar 2: **Habits** (Behavior Tracking)

**Purpose:** Track the "Systems" that power the user's life.

**Features:**
- **Frequency Tabs:** Daily | Weekly | Monthly
  - Users switch tabs to view/create habits of that frequency
  - Reduces clutter, improves focus
- **AI Categorization:** Auto-sorts into 6 domains:
  - 🌹 Health
  - 🌟 Growth
  - 🏢 Career
  - 💰 Finance
  - 💜 Connection
  - ⚡ System
- **Streak Tracking:**
  - Current streak (e.g., "4 day streak 🔥")
  - Visual history (7 days for Daily, 4 weeks for Weekly, 6 months for Monthly)
- **Optimistic UI:** Check/uncheck updates instantly, syncs in background with 500ms debounce
- **Smart Detection:** Pattern detector identifies habit abandonment

**UI Pattern:**
```
[Daily] [Weekly] [Monthly] ← Tabs
─────────────────────────────
Your Daily Systems
Track the habits that power your life.

📚 Read 5 pages
GROWTH • 4 day streak
[✓][✓][✓][✓][ ][ ][✓] ← Last 7 days

⚡ Take vitamins  
SYSTEM • 2 day streak
[ ][✓][✓][ ][ ][ ][ ]
```

---

### Pillar 3: **Intentions** (Goal Management)

**Purpose:** Finite goals across timeframes (vs. infinite habits).

**Features:**
- **Timeframe Tabs:** Daily | Weekly | Monthly | Yearly | Life
- **Focus Banner:** Stream shows pending Daily intentions at top
- **AI Suggestions:** Reflections and onboarding auto-generate intentions
- **Completion Tracking:** Mark done, tracks `completed_at` timestamp
- **Stagnation Detection:** Nudges if goals pending too long

**UI Pattern:**
- Checkbox list grouped by creation date
- Completed items shown as strikethrough below active ones

---

### Pillar 4: **Reflections** (Synthesis Engine)

**Purpose:** AI-powered insights connecting inputs (Stream) with behaviors (Habits).

**Types:**
| Type | Scope | Purpose |
|------|-------|---------|
| **Daily** | Last 24 hours | Quick pattern check |
| **Weekly** | Last 7 days | Deeper synthesis |
| **Monthly** | Last 30 days | Big-picture themes |
| **Thematic** | All entries with tag X | Deep-dive analysis |
| **Yearly (NEW!)** | Annual aggregation | Long-term growth insights |

**What It Analyzes:**
- Entries (feelings, topics)
- Habits (completion rates)
- Intentions (progress)
- Cross-correlations (*"Anxiety spikes when you skip exercise"*)

**Output:**
- Summary paragraph (adapted to selected AI personality)
- 2-4 AI-generated intention suggestions

---

### Pillar 5: **Chat** (Conversational Exploration)

**Purpose:** "Talk to your journal" via conversational AI.

**Features:**
- **RAG Context Window:**
  - Last 15 entries
  - Pending intentions
  - Active habits
  - Latest reflection
  - Search results (keyword extraction)
  - **AI Personality context**
- **Smart Starters:** AI generates conversation openers based on recent data
- **Seamless Onboarding Handoff:** Continues context from onboarding wizard
- **Voice Output (NEW!):** Optional Text-to-Speech for AI responses
- **Personality Adaptation:** Tone matches selected companion

**Technical Implementation:**
- Streaming responses (chunk-by-chunk display)
- Keyword extraction for semantic search
- Full-text search on entries via PostgreSQL
- Dynamic system prompt based on user's personality preference

**Example Queries:**
- *"Why do I procrastinate?"*
- *"What patterns do you see in my anxiety?"*
- *"Help me create a morning routine"*

---

### Pillar 6: **Life** (Long-Term View) - NEW!

**Purpose:** Manage life across domains and track long-term progress.

**Sub-Features:**

#### **6.1 Life Area Dashboards**
- **6 Life Domains:**
  - 🏃 Health: Physical and mental well-being
  - ⚡ Growth: Learning and personal development
  - 💼 Career: Professional goals and projects
  - 💰 Finance: Financial health and planning
  - 💜 Connection: Relationships and community
  - 🛠️ System: Organization and productivity
- **Filtered Views:** Each area shows relevant habits and stats
- **Quick Insights:** AI-generated tips specific to each domain
- **Color Coding:** Visual distinction between areas

#### **6.2 Yearly Review**
- **"Spotify Wrapped" Style:** Animated slideshow presentation
- **Key Metrics:**
  - Total entries and words written
  - Top emotions experienced
  - Longest habit streaks
  - Intentions completed
- **AI Analysis:**
  - Major themes of the year
  - "Core Memories" (most significant entries)
  - Growth patterns
- **Shareable:** Beautiful design for social sharing (future)

#### **6.3 Data Export**
- **Formats:** JSON (machine-readable) and Markdown (human-readable)
- **Complete History:** All entries, habits, intentions, reflections
- **Privacy First:** Emphasizes data ownership
- **No Lock-In:** Users can leave anytime with their data

---

## 5. User Flows

### 5.1 Onboarding Flow: "The Golden Path"

**Goal:** Deliver an "Awe Moment" within 60 seconds without making user face a blank page.

**Steps:**

1. **The Sanctuary (Privacy)**
   - Minimalist lock icon
   - Message: *"Your thoughts. Your vault."*
   
2. **The Spark (Emotion)**
   - Select granular emotion (13 options: Joyful, Anxious, Reflective...)
   - Background gradient shifts to match mood
   
3. **The Container (Life Area)**
   - Select domain: Work | Relationships | Health | Self | Money
   
4. **The Friction (Trigger)**
   - Context-aware triggers based on area
   - Example: Work → "Imposter Syndrome" | "Deadline Pressure"
   
5. **Elaboration**
   - Dynamic question: *"What is making you doubt your value?"*
   - Voice or text input
   - Floating thought bubbles in background (mood-matched)
   
6. **The Companion (NEW!)**
   - Choose AI Personality:
     - 🏛️ Stoic Companion (wise, direct)
     - 💙 Empathetic Friend (warm, validating)
     - 💪 Tough Coach (challenging, accountable)
     - 🔍 Curious Explorer (questioning, analytical)
     - 🎉 Cheerleader (enthusiastic, celebratory)
   - Shows sample responses for each
   
7. **The Awe Moment**
   - AI analyzes: Sentiment + Area + Trigger + Text
   - Typewriter effect reveals insight card (in selected personality's voice)
   - **Smart Suggestions (NEW!):** 2-3 AI-generated habits and intentions
   - Accept/reject each suggestion with one tap
   - Call-to-action: *"Unpack this with AI"* → Launches Chat with full context

---

### 5.2 Daily Usage Flow

**Morning:**
1. Open app → See "Today's Focus" banner with daily intentions
2. Add quick thought via voice while making coffee
3. Check off morning habit ("Meditation")
4. **Personality-matched greeting** in chat

**During Day:**
5. Feeling stressed → Quick entry: *"Overwhelmed by project deadline"*
6. AI auto-tags: `work`, `stress`, suggests: *"Take a 10-minute walk"*
7. **Proactive Nudge appears:** "I've noticed stress mentions increasing. Want to talk?"

**Evening:**
8. Check Habits tab → Mark "Read 5 pages" as done
9. Generate Daily Reflection
10. Review AI insight (adapted to personality): *"Stress peaked when you skipped lunch. Consider meal habit."*
11. Accept AI suggestion → Creates new intention: *"Eat lunch by 1 PM"*
12. **Optional:** Enable voice output to hear AI responses

---

### 5.3 Life Area Exploration Flow (NEW!)

**Scenario:** User wants to focus on Health

1. Tap **Life** tab in nav bar
2. See 6 life area cards with icons and stats
3. Tap **Health** card
4. View:
   - Health habits with streaks
   - Average completion rate
   - AI-generated health insight
5. Tap "2024 Review" button
6. Experience animated yearly review slideshow:
   - Slide 1: "You wrote X words this year"
   - Slide 2: "Your top emotion was..."
   - Slide 3: "Longest streak: 45 days"
   - Slide 4: "This year's theme: Growth through consistency"
   - Slide 5: "Core Memory: [Most impactful entry]"
7. Option to export full year's data

---

## 6. Technical Architecture

### 6.1 Frontend Stack

| Technology | Purpose | Notes |
|------------|---------|-------|
| **React 19** | UI framework | Latest stable |
| **TypeScript** | Type safety | Strict mode enabled |
| **Vite** | Build tool | HMR for dev speed |
| **Tailwind CSS** | Styling | Custom brand colors + dark mode |
| **Framer Motion** | Animations | Used in Life view & onboarding |
| **Supabase Client** | DB/Auth | Real-time subscriptions available |
| **Google Generative AI SDK** | AI integration | Structured JSON outputs |
| **Web Speech API** | Voice I/O | Text-to-Speech & Speech-to-Text |

### 6.2 Backend Stack

| Technology | Purpose | Notes |
|------------|---------|-------|
| **Supabase (PostgreSQL)** | Database | Free tier (500MB) |
| **Supabase Auth** | User management | Magic links + OAuth ready |
| **Row Level Security (RLS)** | Data isolation | Users can only access their own data |
| **Google Gemini 2.5 Flash** | AI model | Latest multimodal model |

### 6.3 Core Architectural Patterns

#### **1. Optimistic UI (Zero Latency UX)**

**Problem:** Network requests create perceived lag.

**Solution:** Update UI immediately, sync DB in background.

**Implementation:**
```typescript
// Example: Habit Toggle
const handleToggleHabit = (habitId) => {
  // 1. Update UI instantly using Ref (prevents race conditions)
  habitLogsRef.current = [...newLogs];
  setHabitLogs(newLogs);
  
  // 2. Debounce network call (500ms)
  debounceTimers.current[habitId] = setTimeout(() => {
    db.syncHabitCompletion(userId, habitId, willBeCompleted);
  }, 500);
}
```

**Benefits:**
- Feels native
- Handles spam-clicking
- Self-healing (server is source of truth)

---

#### **2. Graceful Degradation (AI Safety Net)**

**Problem:** AI APIs can fail (rate limits, outages).

**Solution:** App works as "dumb journal" if AI unavailable.

**Scenario A: Entry Creation**
1. User submits text
2. AI call fails
3. **Fallback:** Save with defaults
   - Tags: `["Unprocessed"]`
   - Emoji: `"📝"`
   - Title: `"Entry"`
4. User's data is never lost

**Scenario B: Habit Creation**
- AI categorization fails → Defaults to `Category: System`, `Emoji: ⚡`

---

#### **3. Debounced Persistence**

**Problem:** Rapid UI interactions (spam-clicking habits) flood DB.

**Solution:** Batch writes with intelligent debouncing.

**Implementation:**
- User clicks habit 5 times in 2 seconds
- Only 1 DB call fires after 500ms of inactivity
- Final state is **idempotent** (DB enforces correctness)

**Benefits:**
- Reduces Supabase API calls (stays under free tier)
- Prevents race conditions
- Improves perceived performance

---

#### **4. Dynamic Personality Loading (NEW!)**

**Problem:** AI needs to adapt tone based on user preference.

**Solution:** Inject personality-specific system prompts.

**Implementation:**
```typescript
const getUserContext = async (userId) => {
  const preferences = await getPreferences(userId);
  return {
    ...context,
    personalityId: preferences.ai_personality || 'stoic'
  };
};

const getChatResponse = async (messages, context) => {
  const personality = getPersonality(context.personalityId);
  const systemInstruction = personality.systemPrompt + contextPrompt;
  // ...
};
```

**Benefits:**
- Single codebase, multiple personalities
- Easy to add new personalities
- User can switch anytime

---

#### **5. Pattern Detection & Proactive Nudging (NEW!)**

**Problem:** Users don't always notice their own patterns.

**Solution:** Background analysis triggers timely interventions.

**Implementation:**
```typescript
// Pattern Detector
const detectMoodDecline = (entries) => {
  const recentNegative = entries
    .slice(0, 3)
    .filter(e => ['Anxious', 'Sad', 'Overwhelmed'].includes(e.sentiment));
  
  return recentNegative.length >= 2; // 2 of last 3 entries negative
};

// Nudge Engine
if (detectMoodDecline(entries)) {
  createNudge({
    pattern_type: 'mood_decline',
    message: 'I'm noticing some challenging emotions lately. Want to talk about it?',
    suggested_action: 'chat_reflection'
  });
}
```

**Detected Patterns:**
- Mood decline (3+ consecutive negative entries)
- Habit abandonment (breaking consistent streaks)
- Intention stagnation (goals pending 7+ days)
- Positive reinforcement (celebrate streaks)

---

### 6.4 State Management

**Pattern:** Centralized logic hook (`useAppLogic.ts`)

**Why not Redux/Zustand?**
- App is small enough for React Context + custom hooks
- Avoids boilerplate
- Keeps logic colocated with UI

**Structure:**
```typescript
const { state, actions } = useAppLogic();

state: {
  entries, reflections, intentions, habits, habitLogs,
  insights, nudges, autoReflections, messages,
  isDataLoaded, aiStatus, toast, ...
}

actions: {
  handleAddEntry, handleToggleHabit, handleSendMessage,
  handleAcceptSuggestion, handleDismissNudge, ...
}
```

---

### 6.5 AI Integration

**Service:** `services/geminiService.ts`

**Key Functions:**

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `processEntry` | Entry text | Title, tags, sentiment, emoji | Enriches raw text |
| `generateReflection` | Entries + Habits + Intentions | Summary + suggestions | Daily/weekly synthesis |
| `getChatResponseStream` | Messages + UserContext | Streaming text | Conversational AI |
| `generateChatStarters` | Recent entries + intentions | 3 conversation openers | Reduce blank-state friction |
| `generateOnboardingSuggestions` (NEW!) | First entry text | Habits + Intentions | Smart onboarding |
| `generateYearlyReview` (NEW!) | Annual data | Themes + Core Memories | Yearly insights |

**Schema-Driven Outputs:**
- All AI calls use `responseMimeType: "application/json"`
- Responses validated against TypeScript interfaces
- Fails gracefully if JSON parsing errors

**Example:**
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        emoji: { type: "string" }
      }
    }
  }
});
```

---

## 7. Database Schema

### Complete Schema Definition

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Custom Enums
create type intention_timeframe as enum ('daily', 'weekly', 'monthly', 'yearly', 'life');
create type intention_status as enum ('pending', 'completed');

-- 1. Profiles Table
create table profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz default now()
);

-- 2. User Preferences Table (NEW!)
create table user_preferences (
  user_id uuid references auth.users(id) on delete cascade not null primary key,
  ai_personality text default 'stoic',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Entries Table
create table entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  title text,
  type text,
  audio_url text,
  timestamp timestamptz default now(),
  tags text[],
  primary_sentiment text,
  emoji text,
  secondary_sentiment text,
  suggestions jsonb
);

-- 4. Reflections Table
create table reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  summary text,
  date date not null,
  timestamp timestamptz default now(),
  type text not null,
  suggestions jsonb,
  auto_generated boolean default false
);

-- 5. Habits Table
create table habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text,
  frequency text not null,
  current_streak int4 default 0,
  longest_streak int4 default 0,
  created_at timestamptz default now(),
  category text
);

-- 6. Habit Logs Table
create table habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  completed_at timestamptz default now()
);

-- 7. Intentions Table
create table intentions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  timeframe intention_timeframe not null,
  status intention_status default 'pending',
  is_recurring bool default false,
  tags text[],
  target_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 8. Insight Cards Table
create table insight_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now(),
  dismissed boolean default false
);

-- 9. Proactive Nudges Table (NEW!)
create table proactive_nudges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  pattern_type text not null,
  message text not null,
  suggested_action text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  acted_on_at timestamptz
);

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table entries enable row level security;
alter table reflections enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table intentions enable row level security;
alter table insight_cards enable row level security;
alter table proactive_nudges enable row level security;

-- RLS Policies (Users can only access their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can view own preferences" on user_preferences for select using (auth.uid() = user_id);
create policy "Users can update own preferences" on user_preferences for update using (auth.uid() = user_id);
create policy "Users can view own entries" on entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on entries for insert with check (auth.uid() = user_id);
create policy "Users can view own nudges" on proactive_nudges for select using (auth.uid() = user_id);
create policy "Users can update own nudges" on proactive_nudges for update using (auth.uid() = user_id);
-- (Additional policies omitted for brevity - see migrations/ for full list)
```

### Key Design Decisions

1. **No user_id in habit_logs**
   - Ownership determined via `habits.user_id` FK
   - Reduces redundancy
   - RLS enforced via EXISTS subquery

2. **JSONB for suggestions**
   - Flexible schema for AI outputs
   - Avoids separate tables for now
   - Can add indexes later if needed

3. **Timezone handling**
   - All timestamps stored as `timestamptz` (UTC)
   - Client converts to local time for display

4. **User preferences table** (NEW!)
   - Stores AI personality preference
   - Extensible for future settings
   - Separate from profiles for clarity

5. **Proactive nudges table** (NEW!)
   - Tracks pattern-based interventions
   - Status field for accept/dismiss tracking
   - Timestamps for analytics

---

## 8. AI System

### 8.1 Model Selection

**Primary Model:** Google Gemini 2.5 Flash

**Why?**
- Fast (<2s latency)
- Multimodal ready (future: voice, images)
- Structured output support (JSON schema)
- Cost-effective vs. GPT-4
- Good at personality adaptation

### 8.2 Personality System (NEW!)

**Implementation:**

**5 Distinct Personalities:**

| Personality | Emoji | Traits | Use Case |
|------------|-------|--------|----------|
| **Stoic Companion** | 🏛️ | Direct, wise, philosophical | Logical users who value clarity |
| **Empathetic Friend** | 💙 | Warm, validating, gentle | Emotional processing, difficult times |
| **Tough Coach** | 💪 | Challenging, accountable, direct | Users who need accountability |
| **Curious Explorer** | 🔍 | Questioning, analytical, Socratic | Self-discovery, deep exploration |
| **Cheerleader** | 🎉 | Enthusiastic, celebratory, positive | Motivation, celebration, momentum |

**Technical Details:**
- Each personality has unique `systemPrompt`
- User selection stored in `user_preferences.ai_personality`
- Prompt dynamically injected into all AI calls
- Can be changed anytime via Settings

**Example System Prompt (Stoic):**
```
You are Mindstream's Stoic Companion—a wise, direct, and compassionate guide.
- Short, clear sentences
- Use "you" and "your" (personal, not clinical)
- Be honest but never harsh
- Occasional philosophical references
- No jargon, no platitudes
Example: "Three days of 'anxious' tags. What's the pattern here?"
```

### 8.3 RAG (Retrieval Augmented Generation)

**Implementation:**
1. User asks question in Chat
2. AI extracts keywords from question
3. PostgreSQL full-text search finds relevant entries
4. Relevant entries injected into system prompt
5. AI responds with informed context (in selected personality's voice)

**Example:**
```
User: "Why do I procrastinate?"

Keywords extracted: ["procrastinate", "delay", "avoidance"]

Search results:
- "Feeling overwhelmed by project" (Nov 20)
- "Avoided starting proposal" (Nov 18)

Context injected:
"[Personality: Stoic] User mentioned procrastination in these entries: [...]
Based on their history, provide insight."
```

### 8.4 Pattern Detection AI (NEW!)

**Purpose:** Automatically identify behavioral patterns without user input.

**Patterns Detected:**
1. **Mood Decline:** 3+ consecutive entries with negative sentiment
2. **Habit Abandonment:** Breaking a 7+ day streak
3. **Intention Stagnation:** Daily intention pending >3 days
4. **Positive Reinforcement:** Milestone streaks (7, 30, 100 days)

**Implementation:**
- Runs on `useEffect` 2 seconds after data loads
- Uses simple heuristics (no ML needed yet)
- Creates nudge records in DB
- UI polls for pending nudges

**Future Enhancements:**
- More sophisticated pattern matching
- Correlation detection (e.g., "anxiety correlates with low sleep")
- Predictive nudging ("You usually skip habits on Fridays")

### 8.5 Yearly Review AI (NEW!)

**Purpose:** Generate annual insights and identify major themes.

**Process:**
1. Aggregate all user data for selected year
2. Calculate statistics (words, sentiment distribution, streaks)
3. AI analyzes entries to extract:
   - **Yearly Themes:** 3-4 major life themes
   - **Core Memories:** Most impactful entries
   - **Growth Patterns:** Changes over time

**AI Prompt Strategy:**
```
Analyze these entries from 2024:
[Sample entries with timestamps]

Identify:
1. 3-4 major themes that defined this year
2. 3-5 "core memories" (most significant moments)
3. Any notable growth patterns

Format: JSON with themes[], coreMemories[]
```

---

## 9. Security & Privacy

### 9.1 Data Ownership

**Your Data = Your Vault**
- All user data stored in their isolated Supabase project
- No analytics tracking
- No third-party data sharing
- **Full export functionality** (JSON + Markdown)
- Users can delete account and take data with them

### 9.2 Authentication

**Provider:** Supabase Auth
- Magic Link (passwordless)
- OAuth ready (Google, GitHub)
- JWT tokens with automatic refresh
- Secure session management

### 9.3 Row Level Security (RLS)

**Enforcement:**
```sql
-- Example: Entries
create policy "Users can view own entries" 
  on entries for select 
  using (auth.uid() = user_id);

-- Example: Habit Logs (via FK)
create policy "Users can view own habit logs"
  on habit_logs for select
  using (
    exists (
      select 1 from habits
      where habits.id = habit_logs.habit_id
      and habits.user_id = auth.uid()
    )
  );
```

**Result:** Users can ONLY access their own data. PostgreSQL enforces at database level (not just app logic).

### 9.4 API Keys

**Current:** Client-side Gemini API key (user provides)
**Roadmap:** Move to Supabase Edge Functions to hide API key

---

## 10. Deployment & DevOps

### 10.1 Architecture

```
GitHub (main branch)
    ↓
Vercel (Auto-deploy)
    ↓
Production URL: mindstream-v1.vercel.app
```

### 10.2 Branch Strategy

| Branch | Purpose | Auto-Deploy |
|--------|---------|-------------|
| `main` | Production | ✅ Yes → Production |
| `onboarding_improvement` | Feature branch | ✅ Yes → Preview URL |
| Feature branches | Development | ✅ Yes → Preview URL |

### 10.3 Deployment Workflow

1. Developer pushes to `onboarding_improvement`
2. Vercel detects commit → Builds preview
3. Preview URL: `mindstream-git-onboarding-improvement.vercel.app`
4. Product Manager tests features
5. Merge PR to `main`
6. Vercel deploys to production within ~60 seconds

### 10.4 Environment Variables

**Required in Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY` (client-side for now)

---

## 11. Future Roadmap

### Phase 6: Enhanced Intelligence (Q1 2026)
- [x] AI Personality System
- [x] Proactive Nudges
- [x] Voice Output (TTS)
- [x] Smart Onboarding Suggestions
- [x] Data Export
- [x] Yearly Review
- [ ] Sentiment trend graphs
- [ ] Habit completion correlation charts
- [ ] Voice journaling with audio storage
- [ ] Automated weekly email summaries

### Phase 7: Platform Expansion (Q2 2026)
- [ ] Progressive Web App (offline mode)
- [ ] iOS/Android native apps (React Native)
- [ ] Browser extension for quick capture
- [ ] API for third-party integrations

### Phase 8: Integrations (Q3 2026)
- [ ] Calendar sync (Google Calendar for Intentions)
- [ ] Spotify integration (music mood analysis)
- [ ] Apple Health / Google Fit (activity correlation)
- [ ] Todoist/Notion sync

### Phase 9: Advanced Features (Q4 2026)
- [ ] Collaborative reflections (share with therapist/coach)
- [ ] Custom personality creation
- [ ] Multi-modal input (photos, location)
- [ ] Advanced pattern ML (beyond heuristics)

---

## Appendix A: Key Metrics

**Current Stats (as of Nov 2025):**
- **Users:** Early access (<100)
- **Entries:** ~8,000
- **Habits Tracked:** ~2,500
- **AI Personalities:** 5 available
- **Average session:** 4.1 minutes
- **Return rate:** 72% (7-day)

**Target Metrics (6 months):**
- 1,000 active users
- 80%+ 7-day retention
- <3s average load time
- 95%+ uptime
- 50%+ users try multiple personalities

---

## Appendix B: Technical Debt

**Resolved:**
1. ~~Missing `user_id` in `habit_logs` insert~~ (FIXED Nov 26)
2. ~~Input bars hidden in Habits/Intentions~~ (FIXED Nov 26)
3. ~~Blank Life view crash~~ (FIXED Nov 29)

**Known Issues:**
1. Type safety (`any` casts in `dbService.ts`)
2. No automated tests
3. Client-side API key exposure
4. Some TypeScript lint errors (module declarations)

**Priority:** Address in Q1 2026

---

## Appendix C: Component Architecture

**Total Components:** 58 files in `/components`

**Key Components:**
- **Views:** `Stream.tsx`, `HabitsView.tsx`, `ChatView.tsx`, `LifeAreaDashboard.tsx` (NEW!), `SettingsView.tsx` (NEW!)
- **Cards:** `EntryCard.tsx`, `HabitCard.tsx`, `IntentionCard.tsx`, `ReflectionCard.tsx`, `YearlyReview.tsx` (NEW!)
- **Interactive:** `OnboardingWizard.tsx`, `PersonalitySelector.tsx` (NEW!), `ProactiveNudge.tsx` (NEW!)
- **Utility:** `NavBar.tsx`, `Header.tsx`, `Toast.tsx`

**Services:** 12 files in `/services`
- **Core:** `dbService.ts`, `geminiService.ts`, `supabaseClient.ts`
- **AI:** `intelligenceEngine.ts`, `reflectionService.ts`, `onboardingSuggestions.ts` (NEW!)
- **Features:** `patternDetector.ts` (NEW!), `nudgeEngine.ts` (NEW!), `yearlyReviewService.ts` (NEW!), `dataExportService.ts` (NEW!)

---

## Appendix D: Contact & Links

**Repository:** [github.com/Shivansh4497/Mindstream_v1](https://github.com/Shivansh4497/Mindstream_v1)  
**Live App:** [mindstream-v1.vercel.app](https://mindstream-v1.vercel.app)  
**Database:** Supabase (PostgreSQL)  
**Product Manager:** Shivansh  
**CTO (AI):** Your Friendly AI Assistant 🤖

---

**Document Change Log:**
- **v4.0 (Nov 29, 2025):** Major update reflecting Phases 4-5 implementation
  - Added AI Personality System (5 personalities)
  - Added Proactive Nudges with pattern detection
  - Added Voice Output (TTS)
  - Added Life Area Dashboards
  - Added Yearly Review ("Spotify Wrapped" style)
  - Added Data Export (JSON + Markdown)
  - Added Smart Onboarding Suggestions
  - Restructured to 6 pillars (added "Life" pillar)
  - Updated all schemas, flows, and technical details
- **v3.0 (Nov 26, 2025):** Frequency tabs, enhanced RAG, production deployment
- **v2.0 (Nov 20, 2025):** Initial production version

---

*End of PRD v4.0*
