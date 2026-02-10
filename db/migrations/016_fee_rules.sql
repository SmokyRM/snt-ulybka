create table if not exists billing_fee_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_from text,
  period_to text,
  applies_to text not null default 'all',
  selector jsonb not null default '{}'::jsonb,
  calc_type text not null default 'flat',
  amount numeric(12, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  is_active boolean not null default true
);

create index if not exists billing_fee_rules_active_idx on billing_fee_rules (is_active);
create index if not exists billing_fee_rules_period_idx on billing_fee_rules (period_from, period_to);

alter table billing_accruals add column if not exists rule_id uuid references billing_fee_rules(id);

create unique index if not exists billing_accruals_period_rule_plot_uidx
  on billing_accruals (period, rule_id, plot_id)
  where rule_id is not null;
