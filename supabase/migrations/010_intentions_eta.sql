-- Migration 010: Convert intentions from timeframe to ETA-based system
-- Created: 2025-11-29
-- Purpose: Replace timeframe buckets with due dates for better prioritization

-- Add new columns
alter table intentions 
add column if not exists due_date timestamp,
add column if not exists is_life_goal boolean default false;

-- Migrate existing data
-- daily → end of today
update intentions 
set due_date = date_trunc('day', now()) + interval '1 day' - interval '1 second'
where timeframe = 'daily' and due_date is null;

-- weekly → end of this week (Sunday)
update intentions
set due_date = date_trunc('week', now()) + interval '1 week' - interval '1 second'
where timeframe = 'weekly' and due_date is null;

-- monthly → end of this month
update intentions
set due_date = date_trunc('month', now()) + interval '1 month' - interval '1 second'
where timeframe = 'monthly' and due_date is null;

-- yearly → end of this year
update intentions
set due_date = date_trunc('year', now()) + interval '1 year' - interval '1 second'
where timeframe = 'yearly' and due_date is null;

-- life → mark as life goal (no due date)
update intentions
set is_life_goal = true
where timeframe = 'life';

-- Remove old timeframe column (keep for now, can drop later after migration verified)
-- alter table intentions drop column timeframe;

-- Add index for querying by due_date
create index if not exists intentions_due_date_idx on intentions(due_date);
create index if not exists intentions_life_goal_idx on intentions(is_life_goal);

-- Comment for documentation
comment on column intentions.due_date is 'Target completion date for the intention';
comment on column intentions.is_life_goal is 'True for ongoing life goals without specific deadlines';
