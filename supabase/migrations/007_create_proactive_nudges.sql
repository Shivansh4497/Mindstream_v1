-- Create proactive_nudges table
CREATE TABLE IF NOT EXISTS proactive_nudges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'mood_decline', 'habit_abandonment', 'intention_stagnation', 'positive_reinforcement'
  message TEXT NOT NULL,
  suggested_action TEXT, -- 'chat_reflection', 'log_entry', 'review_goals'
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acted_on_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE proactive_nudges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own nudges"
  ON proactive_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudges"
  ON proactive_nudges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nudges"
  ON proactive_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proactive_nudges_user_status ON proactive_nudges(user_id, status);
