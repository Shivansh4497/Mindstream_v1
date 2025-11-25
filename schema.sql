-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Custom Enums
create type intention_timeframe as enum ('daily', 'weekly', 'monthly', 'yearly', 'life');
create type intention_status as enum ('pending', 'completed');

-- Profiles Table
create table profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz default now()
);

-- Entries Table
create table entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  title text,
  type text, -- e.g., 'text', 'voice'
  audio_url text,
  timestamp timestamptz default now(),
  tags text[], -- Array of text
  primary_sentiment text,
  emoji text,
  secondary_sentiment text,
  suggestions jsonb
);

-- Reflections Table
create table reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  summary text,
  date date not null,
  timestamp timestamptz default now(),
  type text not null, -- 'daily', 'weekly', 'monthly'
  suggestions jsonb
);

-- Habits Table
create table habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text,
  frequency text not null, -- 'daily', 'weekly', 'monthly'
  current_streak int4 default 0,
  longest_streak int4 default 0,
  created_at timestamptz default now(),
  category text
);

-- Habit Logs Table
create table habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  completed_at timestamptz default now()
);

-- Intentions Table
create table intentions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  timeframe intention_timeframe not null,
  status intention_status default 'pending',
  is_recurring bool default false,
  tags text[],
  target_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) Policies
-- Note: These are standard policies to ensure users can only access their own data.

-- Profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Entries
alter table entries enable row level security;
create policy "Users can view own entries" on entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on entries for insert with check (auth.uid() = user_id);
create policy "Users can update own entries" on entries for update using (auth.uid() = user_id);
create policy "Users can delete own entries" on entries for delete using (auth.uid() = user_id);

-- Reflections
alter table reflections enable row level security;
create policy "Users can view own reflections" on reflections for select using (auth.uid() = user_id);
create policy "Users can insert own reflections" on reflections for insert with check (auth.uid() = user_id);

-- Habits
alter table habits enable row level security;
create policy "Users can view own habits" on habits for select using (auth.uid() = user_id);
create policy "Users can insert own habits" on habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on habits for delete using (auth.uid() = user_id);

-- Habit Logs
alter table habit_logs enable row level security;
create policy "Users can view own habit logs" on habit_logs for select using (
  exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = auth.uid())
);
create policy "Users can insert own habit logs" on habit_logs for insert with check (
  exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = auth.uid())
);
create policy "Users can delete own habit logs" on habit_logs for delete using (
  exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = auth.uid())
);

-- Intentions
alter table intentions enable row level security;
create policy "Users can view own intentions" on intentions for select using (auth.uid() = user_id);
create policy "Users can insert own intentions" on intentions for insert with check (auth.uid() = user_id);
create policy "Users can update own intentions" on intentions for update using (auth.uid() = user_id);
create policy "Users can delete own intentions" on intentions for delete using (auth.uid() = user_id);
