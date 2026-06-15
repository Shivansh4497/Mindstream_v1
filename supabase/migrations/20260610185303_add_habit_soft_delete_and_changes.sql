-- Add is_active column to habits
ALTER TABLE habits
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create habit_changes table
CREATE TABLE habit_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    field_changed TEXT NOT NULL CHECK (field_changed IN ('frequency', 'name', 'category', 'emoji')),
    old_value TEXT,
    new_value TEXT
);

-- RLS policies for habit_changes
ALTER TABLE habit_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit changes"
    ON habit_changes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit changes"
    ON habit_changes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
