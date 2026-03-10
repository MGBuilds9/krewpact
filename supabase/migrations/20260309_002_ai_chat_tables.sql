BEGIN;

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT DEFAULT 'knowledge',
  context_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_sessions_user ON ai_chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "ai_chat_sessions_select_own" ON ai_chat_sessions
  FOR SELECT USING (
    user_id::text = (auth.jwt() ->> 'krewpact_user_id')
    AND (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
  );

CREATE POLICY "ai_chat_sessions_insert_own" ON ai_chat_sessions
  FOR INSERT WITH CHECK (
    user_id::text = (auth.jwt() ->> 'krewpact_user_id')
    AND (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
  );

-- Messages: user can see messages in their own sessions
CREATE POLICY "ai_chat_messages_select_own" ON ai_chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM ai_chat_sessions
      WHERE user_id::text = (auth.jwt() ->> 'krewpact_user_id')
    )
  );

CREATE POLICY "ai_chat_messages_insert_own" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM ai_chat_sessions
      WHERE user_id::text = (auth.jwt() ->> 'krewpact_user_id')
    )
  );

COMMIT;
