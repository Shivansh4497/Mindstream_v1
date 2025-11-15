// FIX: Define all necessary types for the application.

export interface Profile {
  id: string;
  email: string;
  avatar_url: string | null;
}

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  timestamp: string;
  text: string;
  title: string | null;
  tags: string[] | null;
  sentiment: Sentiment | null;
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
