-- ============================================================
-- Agents Unleashed — Migration 003: Vector Dimension Update
-- Changes vector dimension from 1536 (OpenAI) to 768 (Google Gemini)
-- ============================================================

-- 1. Drop the existing match function first
DROP FUNCTION IF EXISTS match_agent_memory;

-- 2. Alter the embedding column dimension
-- Note: This will clear existing embeddings. Since they were failing anyway, this is safe.
ALTER TABLE agent_memory 
  ALTER COLUMN embedding TYPE vector(768);

-- 3. Re-create the match function with the new dimension
CREATE OR REPLACE FUNCTION match_agent_memory(
  query_embedding  vector(768),
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

-- 4. Re-create the index (ivfflat index needs to be recreated after column type change)
DROP INDEX IF EXISTS agent_memory_embedding_idx;
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx
  ON agent_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
