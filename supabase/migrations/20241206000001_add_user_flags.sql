-- Migration: Add user_flags column to user_preferences
-- This enables server-side storage of UX flags for cross-device consistency

-- Add flags column if it doesn't exist
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Comment for documentation
COMMENT ON COLUMN user_preferences.flags IS 'JSON object storing UX flags: { onboardingStep, hasSeenFirstInsight, hasVisitedInsights }';
