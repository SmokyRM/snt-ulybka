-- Migration: 011_search_indexes
-- Add indexes for global search optimization

-- Persons: index on lower(full_name) for case-insensitive search
CREATE INDEX IF NOT EXISTS idx_persons_full_name_lower ON persons (lower(full_name));

-- Persons: index on phone for normalized search
CREATE INDEX IF NOT EXISTS idx_persons_phone ON persons (phone) WHERE phone IS NOT NULL;

-- Persons: index on lower(email)
CREATE INDEX IF NOT EXISTS idx_persons_email_lower ON persons (lower(email)) WHERE email IS NOT NULL;

-- Plots: index on plot_number for exact/prefix search
CREATE INDEX IF NOT EXISTS idx_plots_plot_number ON plots (plot_number) WHERE plot_number IS NOT NULL;

-- Plots: index on lower(snt_street_number)
CREATE INDEX IF NOT EXISTS idx_plots_snt_street_lower ON plots (lower(snt_street_number)) WHERE snt_street_number IS NOT NULL;

-- Payments: index on lower(payer) for search
CREATE INDEX IF NOT EXISTS idx_billing_payments_payer_lower ON billing_payments (lower(payer)) WHERE payer IS NOT NULL;

-- Payments: index on external_id for idempotency lookup
CREATE INDEX IF NOT EXISTS idx_billing_payments_external_id ON billing_payments (external_id) WHERE external_id IS NOT NULL;

-- Payments: index on plot_ref for unmatched payments search
CREATE INDEX IF NOT EXISTS idx_billing_payments_plot_ref ON billing_payments (lower(plot_ref)) WHERE plot_ref IS NOT NULL;

-- Payments: composite index for common filters
CREATE INDEX IF NOT EXISTS idx_billing_payments_status_paid_at ON billing_payments (status, paid_at DESC);
