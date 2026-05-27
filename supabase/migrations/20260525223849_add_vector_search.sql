-- Enable pgvector
create extension if not exists vector;

-- Add embedding column to entries
alter table entries 
add column if not exists embedding vector(384);

-- Use HNSW index (NOT ivfflat — dataset is too small 
-- for ivfflat, hnsw works correctly at any size)
create index if not exists entries_embedding_idx 
on entries 
using hnsw (embedding vector_cosine_ops);

-- Cosine similarity search function
create or replace function match_entries(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
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
    entries.timestamp as "timestamp",
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
  order by entries.embedding <=> query_embedding
  limit match_count;
$$;
