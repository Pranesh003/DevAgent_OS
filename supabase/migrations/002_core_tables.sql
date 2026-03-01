-- ============================================================
-- Agents Unleashed — Core Tables (MongoDB to Supabase Migration)
-- ============================================================

-- ── Users Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT DEFAULT 'developer',
  refresh_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferences    JSONB DEFAULT '{"preferredModel": "gpt-4", "theme": "dark"}'::jsonb,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projects Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT,
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             TEXT DEFAULT 'idle',
  files              JSONB DEFAULT '[]'::jsonb, -- Array of {filename, path, content, language, agentSource, generatedAt}
  architecture       TEXT,
  requirements       TEXT,
  current_session_id TEXT,
  iteration_count    INTEGER DEFAULT 0,
  tags               TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id);

-- ── Activities Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL,
  agent_name   TEXT NOT NULL,
  action       TEXT NOT NULL,
  content      TEXT DEFAULT '',
  metadata     JSONB DEFAULT '{}'::jsonb,
  model_used   TEXT,
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activities_project_idx ON activities(project_id);
CREATE INDEX IF NOT EXISTS activities_session_idx ON activities(session_id);

-- ── Trigger to update `updated_at` ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
