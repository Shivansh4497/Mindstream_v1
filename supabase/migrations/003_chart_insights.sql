-- Chart Insights Table
-- Stores daily AI-generated insights for data visualization charts
CREATE TABLE IF NOT EXISTS chart_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('correlation', 'sentiment', 'heatmap')),
  insight_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups by user and date
CREATE INDEX IF NOT EXISTS idx_chart_insights_user_date 
ON chart_insights(user_id, generated_at DESC);

-- Index for insight type filtering
CREATE INDEX IF NOT EXISTS idx_chart_insights_type 
ON chart_insights(user_id, insight_type, generated_at DESC);

-- Row Level Security (RLS)
ALTER TABLE chart_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own insights
CREATE POLICY "Users can read own chart insights"
ON chart_insights FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can insert insights (for Edge Functions)
CREATE POLICY "Service role can insert chart insights"
ON chart_insights FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS, but this is explicit

-- Optional: Clean up old insights (keep last 30 days)
-- Run this manually or via a cron job if needed
-- DELETE FROM chart_insights 
-- WHERE generated_at < NOW() - INTERVAL '30 days';
