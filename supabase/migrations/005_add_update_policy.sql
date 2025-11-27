-- Add UPDATE policy for chart_insights table
CREATE POLICY IF NOT EXISTS "Users can update own chart insights"
ON chart_insights FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
