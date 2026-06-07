-- Add onboarding context to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_context JSONB;

COMMENT ON COLUMN profiles.onboarding_context IS 
  'Captured during onboarding: { sentiment, life_area, trigger, elaboration_summary, personality_id, onboarded_at }';

-- Add longitudinal AI profile to profiles  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_profile JSONB;

COMMENT ON COLUMN profiles.ai_profile IS
  'Updated weekly by background job: { dominant_emotions, active_life_areas, pattern_summary, goal_trajectory, last_updated }';

-- Add index for ai_profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_ai_profile 
  ON profiles USING gin(ai_profile);
