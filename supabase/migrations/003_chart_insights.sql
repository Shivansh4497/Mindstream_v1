-- Chart Insights Table
-- Stores daily AI-generated insights for data visualization charts
CREATE TABLE IF NOT EXISTS chart_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- AI-generated insights
    correlation_insight TEXT,
    sentiment_insight TEXT,
    daily_pulse TEXT, -- Holistic summary of all insights
    heatmap_insights JSONB, -- Array of insights for each habit
    
    -- Metadata
    insight_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(user_id, insight_date)
);

-- Index for efficient lookups by user and date
CREATE INDEX IF NOT EXISTS idx_chart_insights_user_date 
ON chart_insights(user_id, insight_date DESC);

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
