CREATE TABLE IF NOT EXISTS ownership_verifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  cadastral_number text NOT NULL,
  document_meta jsonb NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX IF NOT EXISTS idx_ownership_verifications_user_id ON ownership_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_cadastral ON ownership_verifications(cadastral_number);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_status ON ownership_verifications(status);
