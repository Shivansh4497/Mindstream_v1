# Product Requirement Document: Mindstream
**Version:** 3.0  
**Last Updated:** November 26, 2025  
**Status:** Production (Live on Vercel)  
**Repository:** [github.com/Shivansh4497/Mindstream_v1](https://github.com/Shivansh4497/Mindstream_v1)  
**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL + Auth), Google Gemini 2.5 Flash  
**Author:** Product Team

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Target User](#2-target-user)
3. [Core Value Proposition](#3-core-value-proposition)
4. [Product Architecture: The 5 Pillars](#4-product-architecture-the-5-pillars)
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

### 1.3 Product Philosophy

1. **Privacy First:** Local-first architecture. Your data = Your vault.
2. **Zero Friction:** Capture thoughts in <5 seconds.
3. **Zero Latency:** Optimistic UI makes the app feel instant.
4. **Contextual Intelligence:** AI knows your history, preventing generic advice.
5. **Graceful Degradation:** Works as a "dumb journal" even if AI fails.

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

**What They Want:**
- A tool that learns their patterns
- Actionable insights, not platitudes
- Fast, beautiful, private

---

## 3. Core Value Proposition

### 3.1 For the User

| Feature | Benefit |
|---------|---------|
| **Voice-First Input** | Capture thoughts while walking, driving, or lying in bed |
| **AI Enrichment** | Auto-tags, titles, and analyzes sentiment without manual work |
| **Habit-Feeling Correlation** | "You felt anxious 3 days in a row. Coincides with skipping meditation." |
| **Conversational Exploration** | Ask your journal questions: "Why do I procrastinate?" |
| **Frequency Tabs (New!)** | View Daily/Weekly/Monthly habits and goals separately for focus |

### 3.2 Competitive Differentiation

| Competitor | What They Do | What Mindstream Does Better |
|------------|--------------|----------------------------|
| Notion/Obsidian | Manual note-taking | **AI auto-organizes** |
| Day One | Beautiful journal |**Connects feelings → actions** |
| Habitica/Streaks | Gamified habits | **Ties habits to emotional state** |
| Therapist Apps | Generic CBT prompts | **Personalized via RAG context** |

---

## 4. Product Architecture: The 5 Pillars

Mindstream is structured around **5 interconnected pillars** feeding a central data lake.

### Pillar 1: **Stream** (Input Layer)

**Purpose:** Capture raw thoughts in a reverse-chronological feed.

**Features:**
- **Voice Dictation:** Web Speech API integration
- **Guided Prompts:** Contextual chips like *"Small win today..."* to unblock users
- **AI Enrichment:**
  - Auto-generates title (3-5 words)
  - Extracts 2-4 tags
  - Analyzes primary + secondary sentiment
  - Assigns emoji
- **Entry Suggestions:** AI generates 3 actionable follow-ups (e.g., "Start a meditation habit")
- **Thematic Reflection:** Click any tag to generate an AI deep-dive on that theme

**UI Pattern:**
- Entries grouped by date (Today, Yesterday, Nov 19...)
- Each entry shows emoji, title, sentiment badge, tags
- Click to expand for full text + suggestions

---

### Pillar 2: **Habits** (Behavior Tracking)

**Purpose:** Track the "Systems" that power the user's life.

**Features:**
- **Frequency Tabs:** Daily | Weekly | Monthly (NEW in v3.0)
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

**UI Pattern (New v3.0):**
```
[Daily] [Weekly] [Monthly] ← Tabs
─────────────────────────────
Your Daily Systems
Track the habits that power your life.

📚 Read 5 pages
GROWTH • 4 day streak
[✓][✓][✓][✓][ ][ ][✓] ← Last 7 days

⚡ take your vitamins  
SYSTEM • 2 day streak
[ ][✓][✓][ ][ ][ ][ ]
```

---

### Pillar 3: **Intentions** (Goal Management)

**Purpose:** Finite goals across timeframes (vs. infinite habits).

**Features:**
- **Timeframe Tabs:** Daily | Weekly | Monthly | Yearly | Life
- **Focus Banner:** Stream shows pending Daily intentions at top
- **AI Suggestions:** Reflections auto-generate new intentions
- **Completion Tracking:** Mark done, tracks `completed_at` timestamp

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

**What It Analyzes:**
- Entries (feelings, topics)
- Habits (completion rates)
- Intentions (progress)
- Cross-correlations (*"Anxiety spikes when you skip exercise"*)

**Output:**
- Summary paragraph
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
- **Smart Starters:** AI generates conversation openers based on recent data
- **Seamless Onboarding Handoff:** Continues context from onboarding wizard

**Technical Implementation:**
- Streaming responses (chunk-by-chunk display)
- Keyword extraction for semantic search
- Full-text search on entries via PostgreSQL

**Example Queries:**
- *"Why do I procrastinate?"*
- *"What patterns do you see in my anxiety?"*
- *"Help me create a morning routine"*

---

## 5. User Flows

### 5.1 Onboarding Flow: "The Golden Path"

**Goal:** Deliver an "Awe Moment" within 60 seconds without making user face a blank page.

**Steps:**

1. **The Sanctuary (Privacy)**
   - Minimalist lock icon
   - Message: *"Your thoughts. Your vault."*
   
2. **The Spark (Emotion)**
   - Select granular emotion (21 options: Grateful, Anxious, Inspired...)
   - Background gradient shifts to match mood (orange for anxious, teal for excited)
   
3. **The Container (Life Area)**
   - Select domain: Work | Relationships | Health | Self | Money
   
4. **The Friction (Trigger)**
   - Context-aware triggers based on area
   - Example: Work → "Imposter Syndrome" | "Deadline Pressure"
   
5. **Elaboration**
   - Dynamic question: *"What is making you doubt your value?"*
   - Floating thought bubbles in background (mood-matched)
   - Voice or text input
   
6. **The Awe Moment**
   - AI analyzes: Sentiment + Area + Trigger + Text
   - Typewriter effect reveals insight card
   - Call-to-action: *"Unpack this with AI"* → Launches Chat with full context

---

### 5.2 Daily Usage Flow

**Morning:**
1. Open app → See "Today's Focus" banner with daily intentions
2. Add quick thought via voice while making coffee
3. Check off morning habit ("Meditation")

**During Day:**
4. Feeling stressed → Quick entry: *"Overwhelmed by project deadline"*
5. AI auto-tags: `work`, `stress`, suggests: *"Take a 10-minute walk"*

**Evening:**
6. Check Habits tab → Mark "Read 5 pages" as done
7. Generate Daily Reflection
8. Review AI insight: *"Stress peaked when you skipped lunch. Consider meal habit."*
9. Accept AI suggestion → Creates new intention: *"Eat lunch by 1 PM"*

---

### 5.3 Habit Creation Flow (v3.0)

**Old Way (v2.0):**
- Scroll past Daily, Weekly, Monthly sections
- Select frequency in input bar
- Create habit

**New Way (v3.0):**
1. Tap Habits tab
2. Select frequency tab: [Daily] [Weekly] [Monthly]
3. Input bar shows: *"Create a new daily habit..."*
4. Type habit name → Auto-categorized and appears in Daily list

**Benefit:** Reduced cognitive load, clearer intent

---

## 6. Technical Architecture

### 6.1 Frontend Stack

| Technology | Purpose | Notes |
|------------|---------|-------|
| **React 19** | UI framework | Latest stable |
| **TypeScript** | Type safety | Strict mode enabled |
| **Vite** | Build tool | HMR for dev speed |
| **Tailwind CSS** | Styling | Custom brand colors |
| **Supabase Client** | DB/Auth | Real-time subscriptions available (not yet used) |
| **Google Generative AI SDK** | AI integration | Structured JSON outputs |

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
  isDataLoaded, aiStatus, toast, ...
}

actions: {
  handleAddEntry, handleToggleHabit, handleSendMessage, ...
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

-- 2. Entries Table
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

-- 3. Reflections Table
create table reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  summary text,
  date date not null,
  timestamp timestamptz default now(),
  type text not null,
  suggestions jsonb
);

-- 4. Habits Table
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

-- 5. Habit Logs Table (No user_id - ownership via habits FK)
create table habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  completed_at timestamptz default now()
);

-- 6. Intentions Table
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

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table entries enable row level security;
alter table reflections enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table intentions enable row level security;

-- RLS Policies (Users can only access their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can view own entries" on entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on entries for insert with check (auth.uid() = user_id);
-- (Additional policies omitted for brevity - see schema.sql for full list)
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

---

## 8. AI System

### 8.1 Model Selection

**Primary Model:** Google Gemini 2.5 Flash

**Why?**
- Fast (< 2s latency)
- Multimodal ready (future: voice, images)
- Structured output support (JSON schema)
- Cost-effective vs. GPT-4

### 8.2 RAG (Retrieval Augmented Generation)

**Implementation:**
1. User asks question in Chat
2. AI extracts keywords from question
3. PostgreSQL full-text search finds relevant entries
4. Relevant entries injected into system prompt
5. AI responds with informed context

**Example:**
```
User: "Why do I procrastinate?"

Keywords extracted: ["procrastinate", "delay", "avoidance"]

Search results:
- "Feeling overwhelmed by project" (Nov 20)
- "Avoided starting proposal" (Nov 18)

Context injected:
"User mentioned procrastination in these entries: [...]
Based on their history, provide insight."
```

### 8.3 System Prompts

**Core Persona:**
```
You are a wise coach and empathetic friend.
- Tone: warm, non-judgmental, concise
- Format: Always return JSON
- Goal: Help user connect feelings to actions
- Never: Generic platitudes, toxic positivity
```

**Key Prompt Strategies:**

1. **Few-Shot Learning**
   - Provide examples of good responses

2. **Constraint Specification**
   - "Title must be 3-5 words"
   - "Select from these 21 sentiments only"

3. **Context Stacking**
   - Feed: Sentiment + Trigger + Life Area + Text
   - Results in highly personalized insights

---

## 9. Security & Privacy

### 9.1 Data Ownership

**Your Data = Your Vault**
- All user data stored in their isolated Supabase project
- No analytics tracking
- No third-party data sharing
- Export functionality planned (roadmap)

### 9.2 Authentication

**Provider:** Supabase Auth
- Magic Link (passwordless)
- OAuth ready (Google, GitHub)
- JWT tokens with automatic refresh

### 9.3 Row Level Security (RLS)

**Enforcement:**
```sql
-- Example: Entries
create policy "Users can view own entries" 
  on entries for select 
  using (auth.uid() = user_id);
```

**Result:** Users can ONLY access their own data. PostgreSQL enforces at database level (not just app logic).

### 9.4 API Keys

**Current:** Client-side Gemini API key (user provides)
**Roadmap:** Move to edge functions to hide API key

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
- User provides: Gemini API key (client-side for now)

---

## 11. Future Roadmap

### Phase 1: Core Stability (Q1 2026)
- [ ] Supabase Type Generation (eliminate `any` casts)
- [ ] Automated testing (Jest + React Testing Library)
- [ ] Error boundary improvements
- [ ] Data export (JSON + Markdown)

### Phase 2: Enhanced Intelligence (Q2 2026)
- [ ] Sentiment trend graphs
- [ ] Habit completion correlation charts
- [ ] Proactive notifications (*"You seem anxious. Want to reflect?"*)
- [ ] Voice journaling (audio storage)

### Phase 3: Integrations (Q3 2026)
- [ ] Calendar sync (Google Calendar for Intentions)
- [ ] Spotify integration (music mood analysis)
- [ ] Apple Health / Google Fit (activity correlation)

### Phase 4: Platform Expansion (Q4 2026)
- [ ] Progressive Web App (offline mode)
- [ ] iOS/Android native apps (React Native)
- [ ] Collaborative reflections (share with therapist/coach)

---

## Appendix A: Key Metrics

**Current Stats (as of Nov 2025):**
- **Users:** Early access (< 100)
- **Entries:** ~5,000
- **Average session:** 3.2 minutes
- **Return rate:** 68% (7-day)

**Target Metrics (6 months):**
- 1,000 active users
- 80%+ 7-day retention
- < 3s average load time
- 95%+ uptime

---

## Appendix B: Technical Debt

**Known Issues:**
1. ~~Missing `user_id` in `habit_logs` insert~~ (FIXED Nov 26)
2. ~~Input bars hidden in Habits/Intentions~~ (FIXED Nov 26)
3. Type safety (`any` casts in `dbService.ts`)
4. No automated tests
5. Client-side API key exposure

**Priority:** Address #3-5 in Q1 2026

---

## Appendix C: Contact & Links

**Repository:** [github.com/Shivansh4497/Mindstream_v1](https://github.com/Shivansh4497/Mindstream_v1)  
**Live App:** [mindstream-v1.vercel.app](https://mindstream-v1.vercel.app)  
**Database:** Supabase (PostgreSQL)  
**Product Manager:** Shivansh  
**CTO (AI):** Your Friendly AI Assistant 🤖

---

*End of PRD v3.0*
