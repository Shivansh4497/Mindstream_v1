-- Add client_event_id column for analytics idempotency
-- This prevents duplicate events from being logged

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS client_event_id UUID;

-- Create unique index for deduplication (only applies to non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_client_event_id_unique 
ON analytics_events (client_event_id) 
WHERE client_event_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS analytics_events_user_event_idx 
ON analytics_events (user_id, event_name, created_at DESC);
