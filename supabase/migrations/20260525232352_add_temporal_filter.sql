-- Drop legacy 4-parameter match_entries function to prevent overloading conflicts
DROP FUNCTION IF EXISTS match_entries(vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS match_entries(vector, float, int, uuid);

-- Drop and recreate match_entries with optional date bound parameters
create or replace function match_entries(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL
)
returns table (
  id uuid,
  text text,
  "timestamp" timestamptz,
  primary_sentiment text,
  tags text[],
  emoji text,
  similarity float
)
language sql stable
as $$
  select
    entries.id,
    entries.text,
    entries.timestamp,
    entries.primary_sentiment,
    entries.tags,
    entries.emoji,
    1 - (entries.embedding <=> query_embedding) 
      as similarity
  from entries
  where entries.user_id = p_user_id
  and entries.deleted_at is null
  and entries.embedding is not null
  and 1 - (entries.embedding <=> query_embedding) 
    > match_threshold
  and (start_date IS NULL 
       OR entries.timestamp >= start_date)
  and (end_date IS NULL 
       OR entries.timestamp <= end_date)
  order by entries.embedding <=> query_embedding
  limit match_count;
$$;
