CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message storage
  messages JSONB NOT NULL DEFAULT '[]',
  message_count INTEGER DEFAULT 0,

  -- Session metadata
  personality TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  -- Coach memory (populated when session closes)
  summary TEXT,
  key_topics TEXT[],
  extractions JSONB DEFAULT '{}'  -- { habits: [], goals: [] } created this session
);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON chat_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_chat_sessions_user_last 
  ON chat_sessions(user_id, last_message_at DESC);

COMMENT ON TABLE chat_sessions IS 
  'Persistent chat sessions. One active session per user. 
   Sessions older than 24h are archived and summarised for coach memory.';
