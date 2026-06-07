

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  ftue_completed?: boolean;
  onboarding_completed?: boolean;
  // Demo Mode V2
  is_demo?: boolean;
  demo_ai_calls_remaining?: number;
  demo_created_at?: string;
}

export type GranularSentiment = 'Joyful' | 'Grateful' | 'Proud' | 'Hopeful' | 'Content' |
  'Anxious' | 'Frustrated' | 'Sad' | 'Overwhelmed' | 'Confused' |
  'Reflective' | 'Inquisitive' | 'Observational';

export interface EntrySuggestion {
  type: 'habit' | 'intention' | 'reflection';
  label: string;
  data: any;
}

export interface Entry {
  id: string;
  user_id: string;
  text: string;
  timestamp: string;
  title?: string;
  emoji?: string;
  tags?: string[];
  primary_sentiment?: GranularSentiment | null;
  secondary_sentiment?: GranularSentiment | null;
  suggestions?: EntrySuggestion[] | null;
  source?: 'manual' | 'voice' | 'chat_takeaway';
  source_meta?: Record<string, unknown>;
}

export interface AISuggestion {
  text: string;
  timeframe: IntentionTimeframe;
}

export interface Reflection {
  id: string;
  user_id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  summary: string;
  suggestions?: AISuggestion[] | null;
  timestamp: string;
  auto_generated?: boolean;
}

export type InsightType = 'correlation' | 'pattern' | 'milestone' | 'thematic';

export interface InsightCard {
  id: string;
  user_id: string;
  type: InsightType;
  title: string;
  content: string;
  metadata?: {
    tags?: string[];
    sentiment_shift?: number;
    habit_ids?: string[];
    [key: string]: any;
  };
  created_at: string;
  dismissed: boolean;
}

export type IntentionTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'life'; // Deprecated, kept for migration
export type IntentionStatus = 'pending' | 'completed';

export interface Intention {
  id: string;
  user_id: string;
  text: string;
  status: IntentionStatus;
  notes?: string; // Optional notes/context for the goal
  emoji?: string; // NEW: AI-assigned emoji
  category?: 'Health' | 'Growth' | 'Career' | 'Finance' | 'Connection' | 'System'; // NEW: AI-assigned category
  timeframe?: IntentionTimeframe; //  Deprecated, use due_date instead
  due_date?: string | null; // NEW: ISO timestamp for deadline
  is_life_goal?: boolean; // NEW: True for ongoing life goals
  is_starred?: boolean; // NEW: High priority toggle
  is_recurring: boolean;
  tags?: string[];
  target_date?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export type HabitCategory = 'Health' | 'Growth' | 'Career' | 'Finance' | 'Connection' | 'System';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
}

export interface Message {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  suggestions?: AISuggestion[];
  extraction?: ExtractionChip;
}

export interface InstantInsight {
  insight: string;
  followUpQuestion: string;
  confidence: number;  // 0.0-1.0 confidence score for quality gating
}

// Phase 1: Temporal Memory - Similar past moments
export interface SimilarMoment {
  entry: Entry;
  matchType: 'sentiment' | 'tag' | 'keyword';
  matchScore: number; // 0-1 relevance score
}

export interface UserContext {
  recentEntries: Entry[];
  pendingIntentions: Intention[];
  activeHabits: Habit[];
  latestReflection: Reflection | null;
  searchResults?: SearchResult[]; // RAG: Historical items matching the current conversation
  similarMoments?: SimilarMoment[]; // Phase 1: Past similar emotional moments
  personalityId?: string;
}

export type AIStatus = 'initializing' | 'verifying' | 'ready' | 'error';

export interface Nudge {
  id: string;
  user_id: string;
  pattern_type: 'mood_decline' | 'habit_abandonment' | 'intention_stagnation' | 'positive_reinforcement';
  message: string;
  suggested_action: 'chat_reflection' | 'log_entry' | 'review_goals';
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
  acted_on_at?: string;
}

export interface SearchResult {
  type: 'entry' | 'habit' | 'intention';
  item: Entry | Habit | Intention;
  matchText: string; // The text that matched (for highlighting)
  timestamp: string; // Unified timestamp for sorting
}

export interface ChatSession {
  id: string;
  user_id: string;
  messages: Message[];
  message_count: number;
  personality: string | null;
  started_at: string;
  last_message_at: string;
  summary: string | null;
  key_topics: string[] | null;
  extractions: { habits: string[]; goals: string[] };
}

export interface ExtractionResult {
  action: 'create_habit' | 'log_habit' | 'create_goal' | 'none';
  name?: string;
  frequency?: string;
  category?: string;
  commitment_level?: 'definite' | 'aspirational' | 'reflective';
  matched_item_name?: string;
  classificationConfidence: number;
  extractionConfidence?: number;
  skippedReason?: string;
  due_date?: string;
  is_life_goal?: boolean;
}

export interface ExtractionChip {
  id: string;                          // unique per message
  action: 'create_habit' | 'log_habit' | 'create_goal';
  name: string;
  commitment_level: 'definite' | 'aspirational';
  status: 'pending' | 'confirmed' | 'dismissed' | 'undone';
  itemId?: string;                     // DB id once created — for undo
}

export interface CorrelationInsight {
  id?: string;
  pattern_text: string;
  pattern_type: 'habit_mood' | 'time_mood' | 'goal_behavior' | 'streak_mood' | string;
  confidence: number;
  week_id: string;
  evidence_entry_ids?: string[];
  evidence_habit_ids?: string[];
  generated_at?: string;
  dismissed_at?: string | null;
}

export interface OnboardingContext {
  sentiment: string;
  life_area: string;
  trigger: string;
  elaboration_summary: string;
  personality_id: string;
  onboarded_at: string;
}

export interface AIProfile {
  dominant_emotions: string[];
  active_life_areas: string[];
  pattern_summary: string;
  goal_trajectory: string;
  last_updated: string;
}
