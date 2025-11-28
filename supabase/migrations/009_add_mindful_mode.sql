-- Migration 009: Add mindful mode preference
-- Created: 2025-11-29
-- Purpose: Store user preference for mindful pause feature

-- Add column to user_preferences table
alter table user_preferences 
add column if not exists mindful_mode_enabled boolean default true;

-- Comment for documentation
comment on column user_preferences.mindful_mode_enabled is 
  'Whether user wants breathing pause before creating entries';

-- RLS policies already exist for user_preferences table
-- No additional policies needed
