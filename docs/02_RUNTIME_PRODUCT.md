Runtime Phase 2 revision complete. This version treats the running implementation as source of truth and uses docs only to flag contradictions.

**Runtime Product**
Observed product today: Mindstream is a private journaling, habit/goal, and AI chat application with three active main tabs: **Stream**, **Life**, and **Chat**.

The active runtime product is not the older four-tab product described in docs. The current bottom navigation is defined in [NavBar.tsx](/Users/director/Desktop/Mindstream_v1/components/NavBar.tsx:4) as:

- `Stream`
- `Life`
- `Chat`

`Settings` is reachable from the header, not the bottom nav.

**Runtime App Flow**
Observed startup path:

1. [index.tsx](/Users/director/Desktop/Mindstream_v1/index.tsx:1) checks required Supabase and Gemini configuration.
2. If config is missing, app renders `ConfigurationError`.
3. Otherwise app renders `AuthProvider` → `App`.
4. [App.tsx](/Users/director/Desktop/Mindstream_v1/App.tsx:1) shows:
   - loading spinner while auth loads
   - `Login` if unauthenticated
   - `MindstreamApp` if authenticated
5. [MindstreamApp.tsx](/Users/director/Desktop/Mindstream_v1/MindstreamApp.tsx:1) controls onboarding, main views, modals, AI state banner, and bottom nav.

**Authentication**
Active runtime auth:

- Google OAuth
- Anonymous demo login

Observed in [Login.tsx](/Users/director/Desktop/Mindstream_v1/components/Login.tsx:1) and [AuthContext.tsx](/Users/director/Desktop/Mindstream_v1/context/AuthContext.tsx:1).

No magic-link UI is currently rendered, even though older docs mention it.

Runtime login screen messaging positions the product as:
- “Your thoughts. Finally understood.”
- “Mindstream connects your journals, habits, goals, and conversations to help you discover patterns you might otherwise miss.”

**Onboarding**
Runtime onboarding has two entry paths:

- Quick Start
- Guided Setup

Quick Start:
- Sets onboarding complete state.
- Logs onboarding event.
- Sends user into the main app, defaulting to Stream.

Guided Setup:
- Resets account data.
- Refreshes all data.
- Enters `OnboardingWizard`.

Runtime guided onboarding steps observed from [OnboardingWizard.tsx](/Users/director/Desktop/Mindstream_v1/components/OnboardingWizard.tsx:293):

- Splash
- Sanctuary
- Spark / emotion selection
- Container / life area
- Friction / trigger
- Elaboration
- Processing
- Awe / instant insight

There is a `personality` step in the component, but the runtime step transition visible from sanctuary goes to `spark`; I did not confirm a reachable path into `personality`.

**Active Main Screens**
Stream:
Purpose: journal feed and thought capture.

Actually rendered:
- Empty stream state if no feed items.
- Date-grouped `EntryCard`s.
- Mood header if today has entries and dominant sentiment.
- Shared input bar with placeholder “What’s on your mind?”

Wired data:
- entries
- insights
- autoReflections
- intentions
- nudges

Important runtime finding:
Although Stream builds a merged feed of entries, insights, and auto-reflections, it currently only renders entries. Non-entry feed items fall through to `return null` in [Stream.tsx](/Users/director/Desktop/Mindstream_v1/components/Stream.tsx:1).

Dormant inside Stream:
- `InsightCardComponent` imported but not rendered
- `AutoReflectionCard` imported but not rendered
- `TodaysFocusBanner` imported but not rendered
- nudges passed in but not rendered
- load-more props passed in but no visible Load More control found in Stream render

Life:
Purpose: active habit/task/goal management.

Actually rendered:
- Header “Life”
- Nudge icon for weekly/monthly habit reminders
- Internal tabs:
  - Today
  - Goals

Today subview:
- Daily habits
- Due today tasks
- Weekly habits
- Monthly habits
- Shared input: “Add habit or task…”
- EntryTypeModal lets input become:
  - daily habit
  - weekly habit
  - monthly habit
  - task with deadline

Goals subview:
- Goals grouped by category.
- Empty state if no pending intentions.
- Shared input: “Add a goal…”
- EntryTypeModal starts directly in task-deadline mode.
- Goals can be toggled, edited, starred, or deleted.

Chat:
Purpose: AI conversation with the user.

Actually rendered:
- Voice toggle
- Chat sharing toggle, hidden in demo
- Save Takeaway button after threshold
- Empty chat state
- Seeded continuation state
- Message bubbles
- Extraction chips on AI messages
- Chat sharing modal
- Takeaway toast

Runtime threshold for Save Takeaway:
- `messages.length >= 6`
- user word count >= 20

Chat data/features wired:
- message history
- TTS local preference
- chat sharing local preference
- chat feedback persistence
- save/update chat takeaway
- extraction confirmation/undo
- demo Glass Box integration

Settings:
Purpose: user controls and internal tools.

Actually rendered:
- Back button to Stream
- Mindstream Companion / PersonalitySelector
- Data export as JSON
- Data export as Markdown
- Shared conversations count and delete action
- Developer Tools → Debug Insights Quality

Header:
Actually rendered across main app:
- Mindstream logo/title
- Search button
- Settings button
- User avatar menu

User menu:
- How It Works
- Settings
- Logout
- Delete Account

**Active Modals**
Reachable modals:

- SearchModal from header search
- InfoModal from user menu
- DeleteConfirmationModal for entries
- EditEntryModal
- EditHabitModal, though current active Life habit editing mostly uses HabitDetailPopup
- EditIntentionModal
- ThematicModal from entry tag click
- InsightModal from `state.pendingInsight`
- ReflectionUnlockModal from unlock state
- DemoLimitModal
- DemoWelcomeModal
- GlassBox modal/docked panel for demo/engineer view
- EntryTypeModal from Life inputs
- HabitDetailPopup from Life habit grid
- ChatSharingModal from Chat

**AI Touchpoints Actually Wired**
AI verification:
- App verifies AI availability during data load.

Entry creation:
- Adds temporary “Analyzing…” entry.
- Then processes entry through Gemini service.
- Entry may receive title, tags, sentiment, emoji, suggestions.
- May generate first-entry pending insight.

Entry suggestions:
- Render inside expanded EntryCard.
- Suggestion types map to:
  - habit creation
  - intention creation
  - chat/reflection route

Chat:
- `handleSendMessage` calls AI chat response flow.
- Chat supports extraction results that can become habits or intentions.
- Chat takeaway uses `callAIProxy('chat-summary', ...)`.

Onboarding:
- Guided onboarding calls instant insight generation.
- Onboarding context is saved.

Thematic reflection:
- Tag modal can generate a thematic reflection.

Background intelligence:
Observed from `useAppLogic`:
- nudges are checked after data load
- embeddings are backfilled
- correlation engine runs
- profile engine runs

Important runtime distinction:
Some background AI/intelligence runs, but not all outputs are visible in current navigation.

**Data Model as Experienced by Runtime**
Primary runtime data objects:

- Profile
- Entries
- Reflections
- Intentions
- Habits
- Habit logs
- Insight cards
- Auto reflections
- Nudges
- Correlation insight
- Chat messages
- Chat feedback
- Chat takeaways
- User preferences/personality
- Demo profile/data
- Analytics events

**Active Services by Runtime Wiring**
Observed service usage:

- `dbService`: primary data access and persistence
- `geminiService`: entry processing, chat, onboarding insight, suggestions
- `geminiClient`: AI proxy and AI metadata
- `reflectionService`: thematic reflection and chat starters
- `extractionService`: chat extraction pipeline
- `nudgeEngine`: background nudge generation
- `correlationEngine`: background correlation insight
- `profileEngine`: background profile/memory update
- `dataExportService`: export from Settings
- `yearlyReviewService`: imported and wired only through dormant Insights path

**Dormant / Not Currently Reachable**
These exist in code but are not reachable through current active navigation, or are wired but not rendered:

- `InsightsView`
- `ReflectionsView`
- Daily/weekly/monthly reflection screen
- `LifeAreaDashboard`
- `YearlyReview`
- legacy Habits tab view
- legacy Intentions tab view
- legacy Focus model
- Stream-rendered insight cards
- Stream-rendered auto reflection cards
- Stream-rendered nudges
- Today’s Focus banner
- Chat starter chips: generated in `MindstreamApp`, but no render usage found
- Load more in Stream: action passed, but no rendered control found

**Documentation Contradictions**
Docs describe:
- Four main tabs: Stream, Focus, Insights, Chat

Runtime shows:
- Three bottom tabs: Stream, Life, Chat

Docs describe:
- Insights unlocking and navigating to Insights

Runtime shows:
- Reflection unlock modal exists, but its navigate handler currently sets view to `stream`, not `insights`.

Docs describe:
- Proactive nudges in Stream

Runtime shows:
- Nudge data is fetched and passed to Stream, but Stream does not render nudges.

Docs describe:
- Stream feed containing entries, insights, and reflections

Runtime shows:
- Stream constructs those item types but only renders entries.

Docs mention:
- Magic link auth

Runtime shows:
- Google auth and demo auth only.

**Current Runtime Product Map**
Active product today:

- Login/demo
- Onboarding choice
- Guided emotional onboarding
- Stream journal capture
- Entry enrichment and suggestions
- Tag-based thematic modal
- Life habit/task/goal management
- Habit detail/edit/delete
- Goal edit/star/complete/delete
- AI chat
- Voice input across shared input surfaces
- TTS in chat
- Chat sharing
- Chat takeaways
- Settings/personality/export/privacy/dev debug
- Demo mode with seeded data and Glass Box

Dormant product today:

- Full Insights/reflections destination
- Yearly review
- Life area dashboard
- Focus tab
- Proactive nudge cards in Stream
- Auto-reflection cards in Stream
- Insight cards in Stream
- Chat starter chips

Unknowns remaining:

- Whether dormant features are intentionally paused or accidentally disconnected.
- Whether Life fully replaced Focus/Insights as the active product direction.
- Whether reflection unlock should lead to Stream by design or is stale wiring.
- Whether Stream’s non-entry feed rendering is intentionally removed or incomplete.
- Whether “personality” onboarding step is intended to be reachable.

todays date: 2026-07-03
latest commit id: 8a30b86a2b702c4790f42c9486f7e85b6d5a77eb
