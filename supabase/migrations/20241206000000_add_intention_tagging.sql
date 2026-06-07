-- Add emoji and category columns to intentions table for AI tagging
-- Similar to habits, intentions will now have AI-assigned emoji and category

ALTER TABLE intentions 
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🎯',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Growth';

-- Add constraint to ensure category is valid (optional, can be enforced at app level)
-- ALTER TABLE intentions ADD CONSTRAINT intentions_category_check 
--   CHECK (category IN ('Health', 'Growth', 'Career', 'Finance', 'Connection', 'System'));

COMMENT ON COLUMN intentions.emoji IS 'AI-assigned emoji for the intention';
COMMENT ON COLUMN intentions.category IS 'AI-assigned life area category';
