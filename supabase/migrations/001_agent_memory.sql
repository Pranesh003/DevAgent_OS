-- ============================================================
-- Agents Unleashed — Supabase Vector Memory Setup
-- Run this in Supabase SQL editor to initialize the memory table
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Agent Memory Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_memory (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'general',
  project_id    TEXT,
  user_id       TEXT,
  metadata      JSONB DEFAULT '{}',
  embedding     vector(1536),            -- OpenAI text-embedding-3-small dimension
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx
  ON agent_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for project filtering
CREATE INDEX IF NOT EXISTS agent_memory_project_idx ON agent_memory(project_id);
CREATE INDEX IF NOT EXISTS agent_memory_type_idx ON agent_memory(type);

-- ── Match Function (used by JS and Python clients) ───────────────────────────
CREATE OR REPLACE FUNCTION match_agent_memory(
  query_embedding  vector(1536),
  match_threshold  float   DEFAULT 0.7,
  match_count      int     DEFAULT 5,
  filter_project_id TEXT   DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  content       TEXT,
  type          TEXT,
  project_id    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.content,
    m.type,
    m.project_id,
    m.metadata,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM agent_memory m
  WHERE
    (filter_project_id IS NULL OR m.project_id = filter_project_id)
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Allow anon/service role full access (lock down per your needs)
CREATE POLICY "Allow all for service role" ON agent_memory
  FOR ALL USING (true);
