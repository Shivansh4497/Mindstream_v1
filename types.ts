

export interface Profile {
  id: string;
  email: string;
  avatar_url?: string;
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
}

export type IntentionTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'life';
export type IntentionStatus = 'pending' | 'completed';

export interface Intention {
  id: string;
  user_id: string;
  text: string;
  status: IntentionStatus;
  timeframe: IntentionTimeframe;
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
}

export interface InstantInsight {
  insight: string;
  followUpQuestion: string;
}

export interface UserContext {
  recentEntries: Entry[];
  pendingIntentions: Intention[];
  activeHabits: Habit[];
  latestReflection: Reflection | null;
  searchResults?: Entry[]; // RAG: Historical entries matching the current conversation
}

export type AIStatus = 'initializing' | 'verifying' | 'ready' | 'error';
