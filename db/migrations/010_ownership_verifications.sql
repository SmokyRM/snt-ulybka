CREATE TABLE IF NOT EXISTS ownership_verifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- pgOwnershipStore path (cadastral-based)
  user_id text,
  cadastral_number text,
  document_meta jsonb,
  -- verify route path (plot-based)
  plot_id text,
  reviewed_by text,
  -- shared
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX IF NOT EXISTS idx_ownership_verifications_user_id ON ownership_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_cadastral ON ownership_verifications(cadastral_number);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_plot_id ON ownership_verifications(plot_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_status ON ownership_verifications(status);
