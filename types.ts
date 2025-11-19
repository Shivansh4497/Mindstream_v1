
// FIX: Define all necessary types for the application.

export interface Profile {
  id: string;
  email: string;
  avatar_url: string | null;
}

export type GranularSentiment =
  // Positive
  | 'Joyful' | 'Grateful' | 'Proud' | 'Hopeful' | 'Content'
  // Negative
  | 'Anxious' | 'Frustrated' | 'Sad' | 'Overwhelmed' | 'Confused'
  // Contemplative
  | 'Reflective' | 'Inquisitive' | 'Observational';


export interface Entry {
  id: string;
  user_id: string;
  timestamp: string;
  text: string;
  title?: string | null;
  emoji?: string | null;
  tags?: string[] | null;
  primary_sentiment?: GranularSentiment | null;
  secondary_sentiment?: GranularSentiment | null;
}

export interface AISuggestion {
    text: string;
    timeframe: IntentionTimeframe;
}

export interface Reflection {
  id:string;
  user_id: string;
  date: string; // YYYY-MM-DD for daily, or a week/month identifier
  summary: string;
  type: 'daily' | 'weekly' | 'monthly';
  timestamp: string;
  suggestions?: AISuggestion[];
}

export interface Message {
  id?: string | number;
  sender: 'user' | 'ai';
  text: string;
  suggestions?: AISuggestion[];
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
    tags: string[] | null;
    target_date: string | null;
    completed_at: string | null;
    created_at: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type HabitCategory = 'Health' | 'Growth' | 'Career' | 'Finance' | 'Connection' | 'System';

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
