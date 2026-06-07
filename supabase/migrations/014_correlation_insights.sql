CREATE TABLE IF NOT EXISTS correlation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The pattern found
  pattern_text TEXT NOT NULL,        -- "Your anxiety entries cluster on days you skip exercise"
  evidence_entry_ids UUID[],         -- Entry IDs that support this pattern
  evidence_habit_ids UUID[],         -- Habit IDs involved
  confidence FLOAT NOT NULL,         -- 0.0-1.0
  pattern_type TEXT NOT NULL,        -- 'habit_mood' | 'time_mood' | 'goal_behavior' | 'streak_mood'
  
  -- Lifecycle
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  week_id TEXT NOT NULL,             -- e.g. "2026-W23" — one per user per week
  dismissed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, week_id)           -- one correlation insight per user per week
);

ALTER TABLE correlation_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own correlations"
  ON correlation_insights FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_correlation_user_week 
  ON correlation_insights(user_id, week_id DESC);
