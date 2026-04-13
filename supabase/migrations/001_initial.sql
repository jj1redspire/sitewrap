-- ============================================================
-- SiteWrap Initial Schema Migration
-- 001_initial.sql
-- ============================================================
-- Storage buckets must be created manually in the Supabase dashboard:
--   "walkthroughs"  (private) — stores audio recordings
--   "signatures"    (private) — stores signature images
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  client_name   TEXT,
  client_email  TEXT,
  client_phone  TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- ------------------------------------------------------------
-- punch_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS punch_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_number    INTEGER NOT NULL,
  room           TEXT NOT NULL,
  description    TEXT NOT NULL,
  severity       TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor')),
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_progress', 'completed')),
  assigned_trade TEXT,
  photo_urls     TEXT[] NOT NULL DEFAULT '{}',
  notes          TEXT,
  completed_at   TIMESTAMPTZ,
  completed_by   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS punch_items_project_id_idx ON punch_items(project_id);

-- ------------------------------------------------------------
-- change_orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  requested_by     TEXT NOT NULL,
  line_items       JSONB NOT NULL DEFAULT '[]',
  total_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'signed', 'rejected')),
  audio_url        TEXT,
  transcript       TEXT,
  signature_token  TEXT,
  signature_url    TEXT,
  signed_by        TEXT,
  signed_at        TIMESTAMPTZ,
  pdf_url          TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS change_orders_project_id_idx ON change_orders(project_id);
CREATE INDEX IF NOT EXISTS change_orders_signature_token_idx ON change_orders(signature_token);

-- ------------------------------------------------------------
-- walkthroughs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS walkthroughs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audio_url    TEXT NOT NULL,
  transcript   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('punchlist', 'change_order')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS walkthroughs_project_id_idx ON walkthroughs(project_id);

-- ------------------------------------------------------------
-- signatures
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signatures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type       TEXT NOT NULL CHECK (document_type IN ('punchlist', 'change_order')),
  document_id         UUID NOT NULL,
  token               TEXT NOT NULL UNIQUE,
  signer_name         TEXT,
  signer_email        TEXT,
  signature_image_url TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'signed', 'expired')),
  signed_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signatures_token_idx ON signatures(token);
CREATE INDEX IF NOT EXISTS signatures_document_id_idx ON signatures(document_id);

-- ------------------------------------------------------------
-- sw_subscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sw_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT NOT NULL,
  stripe_sub_id       TEXT NOT NULL,
  plan_tier           TEXT NOT NULL CHECK (plan_tier IN ('project', 'unlimited')),
  status              TEXT NOT NULL DEFAULT 'active',
  current_period_end  TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sw_subscriptions_user_id_idx ON sw_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS sw_subscriptions_stripe_sub_id_idx ON sw_subscriptions(stripe_sub_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update projects.updated_at when punch_items change
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET updated_at = NOW()
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER punch_items_update_project_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON punch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();

CREATE OR REPLACE TRIGGER change_orders_update_project_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();

-- Auto-update projects.updated_at when project itself is modified
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER sw_subscriptions_set_updated_at
  BEFORE UPDATE ON sw_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkthroughs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_subscriptions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- projects policies
-- Users can only access their own projects
-- ------------------------------------------------------------
CREATE POLICY "projects_select_own"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- punch_items policies
-- Users can access items in projects they own
-- ------------------------------------------------------------
CREATE POLICY "punch_items_select_own"
  ON punch_items FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "punch_items_insert_own"
  ON punch_items FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "punch_items_update_own"
  ON punch_items FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "punch_items_delete_own"
  ON punch_items FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- change_orders policies
-- Users can access change orders in projects they own
-- ------------------------------------------------------------
CREATE POLICY "change_orders_select_own"
  ON change_orders FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "change_orders_insert_own"
  ON change_orders FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "change_orders_update_own"
  ON change_orders FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "change_orders_delete_own"
  ON change_orders FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- walkthroughs policies
-- Users can access walkthroughs in projects they own
-- ------------------------------------------------------------
CREATE POLICY "walkthroughs_select_own"
  ON walkthroughs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "walkthroughs_insert_own"
  ON walkthroughs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "walkthroughs_update_own"
  ON walkthroughs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "walkthroughs_delete_own"
  ON walkthroughs FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- signatures policies
-- SELECT: public access by token (for sign page — no auth required)
-- INSERT/UPDATE: authenticated users or service role only
-- ------------------------------------------------------------

-- Anyone can look up a signature by token (needed for the /sign/[token] public page)
CREATE POLICY "signatures_select_by_token"
  ON signatures FOR SELECT
  USING (true);

-- Only authenticated users can create signature requests
CREATE POLICY "signatures_insert_authenticated"
  ON signatures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users or service role can update signatures
-- (The sign route uses service client, which bypasses RLS)
CREATE POLICY "signatures_update_authenticated"
  ON signatures FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- sw_subscriptions policies
-- Users can only see and manage their own subscription
-- Writes are handled by service role (webhook) — bypasses RLS
-- ------------------------------------------------------------
CREATE POLICY "sw_subscriptions_select_own"
  ON sw_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "sw_subscriptions_update_own"
  ON sw_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKET NOTES
-- ============================================================
-- The following storage buckets must be created manually in the
-- Supabase dashboard (Storage > New bucket):
--
--   Bucket name: walkthroughs
--   Public: false (private)
--   Used for: audio recordings from site walkthroughs
--   Path pattern: {user_id}/{project_id}/{timestamp}.webm
--
--   Bucket name: signatures
--   Public: false (private)
--   Used for: signature PNG images
--   Path pattern: {token}.png
--
-- Storage RLS policies (set via dashboard or SQL after bucket creation):
--
--   walkthroughs — INSERT:
--     (bucket_id = 'walkthroughs' AND auth.uid()::text = (storage.foldername(name))[1])
--
--   walkthroughs — SELECT:
--     (bucket_id = 'walkthroughs' AND auth.uid()::text = (storage.foldername(name))[1])
--
--   signatures — INSERT:
--     (bucket_id = 'signatures') -- service role handles inserts
--
--   signatures — SELECT:
--     (bucket_id = 'signatures') -- tokens are UUIDs, effectively private by obscurity
-- ============================================================
