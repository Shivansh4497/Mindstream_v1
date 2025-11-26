-- Drop old chart_insights table if it exists
DROP TABLE IF EXISTS chart_insights CASCADE;

-- Create new chart_insights table with updated schema
CREATE TABLE chart_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- AI-generated insights
    correlation_insight TEXT,
    sentiment_insight TEXT,
    daily_pulse TEXT,
    heatmap_insights JSONB,
    
    -- Metadata
    insight_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(user_id, insight_date)
);

-- Index for efficient lookups by user and date
CREATE INDEX idx_chart_insights_user_date 
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
WITH CHECK (true);

-- Policy: Users can insert their own insights
CREATE POLICY "Users can insert own chart insights"
ON chart_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);
