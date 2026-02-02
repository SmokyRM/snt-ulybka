create table if not exists billing_penalty_accruals (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null,
  period text not null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  linked_charge_id uuid,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  frozen_by uuid,
  frozen_at timestamptz,
  freeze_reason text,
  unfrozen_by uuid,
  unfrozen_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_penalty_accruals_period_idx on billing_penalty_accruals (period);
create index if not exists billing_penalty_accruals_plot_idx on billing_penalty_accruals (plot_id);
create unique index if not exists billing_penalty_accruals_plot_period_active_idx
  on billing_penalty_accruals (plot_id, period)
  where status <> 'voided';
