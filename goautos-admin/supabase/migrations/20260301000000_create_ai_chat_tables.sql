-- ============================================================
-- AI Chat persistence: conversations + messages
-- ============================================================

-- 1. ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON ai_conversations (user_auth_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_client
  ON ai_conversations (client_id);

-- 2. ai_messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages (conversation_id, created_at ASC);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_ai_conversation_updated_at ON ai_conversations;
  CREATE TRIGGER trg_ai_conversation_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_conversation_timestamp();
  RAISE NOTICE 'Trigger trg_ai_conversation_updated_at created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating trigger trg_ai_conversation_updated_at: %', SQLERRM;
END;
$$;

-- Also bump updated_at when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_ai_message_touch_conversation ON ai_messages;
  CREATE TRIGGER trg_ai_message_touch_conversation
    AFTER INSERT ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();
  RAISE NOTICE 'Trigger trg_ai_message_touch_conversation created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating trigger trg_ai_message_touch_conversation: %', SQLERRM;
END;
$$;

-- 4. RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages FORCE ROW LEVEL SECURITY;

-- Conversations: owner can SELECT, INSERT, UPDATE, DELETE
DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_conversations_select_own" ON ai_conversations;
  CREATE POLICY "ai_conversations_select_own"
    ON ai_conversations FOR SELECT
    USING (user_auth_id = auth.uid());
  RAISE NOTICE 'Policy ai_conversations_select_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_conversations_select_own: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_conversations_insert_own" ON ai_conversations;
  CREATE POLICY "ai_conversations_insert_own"
    ON ai_conversations FOR INSERT
    WITH CHECK (user_auth_id = auth.uid());
  RAISE NOTICE 'Policy ai_conversations_insert_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_conversations_insert_own: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_conversations_update_own" ON ai_conversations;
  CREATE POLICY "ai_conversations_update_own"
    ON ai_conversations FOR UPDATE
    USING (user_auth_id = auth.uid());
  RAISE NOTICE 'Policy ai_conversations_update_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_conversations_update_own: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_conversations_delete_own" ON ai_conversations;
  CREATE POLICY "ai_conversations_delete_own"
    ON ai_conversations FOR DELETE
    USING (user_auth_id = auth.uid());
  RAISE NOTICE 'Policy ai_conversations_delete_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_conversations_delete_own: %', SQLERRM;
END;
$$;

-- Messages: accessible if user owns the parent conversation
DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_messages_select_own" ON ai_messages;
  CREATE POLICY "ai_messages_select_own"
    ON ai_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.user_auth_id = auth.uid()
      )
    );
  RAISE NOTICE 'Policy ai_messages_select_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_messages_select_own: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_messages_insert_own" ON ai_messages;
  CREATE POLICY "ai_messages_insert_own"
    ON ai_messages FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.user_auth_id = auth.uid()
      )
    );
  RAISE NOTICE 'Policy ai_messages_insert_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_messages_insert_own: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ai_messages_delete_own" ON ai_messages;
  CREATE POLICY "ai_messages_delete_own"
    ON ai_messages FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.user_auth_id = auth.uid()
      )
    );
  RAISE NOTICE 'Policy ai_messages_delete_own created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policy ai_messages_delete_own: %', SQLERRM;
END;
$$;

-- 5. Grants for service_role
GRANT ALL ON ai_conversations TO service_role;
GRANT ALL ON ai_messages TO service_role;
