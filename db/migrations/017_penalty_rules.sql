create table if not exists billing_penalty_rules (
  id uuid primary key default gen_random_uuid(),
  rate numeric(10, 4) not null default 0,
  rate_type text not null default 'percent_per_year',
  grace_period_days int not null default 0,
  period_from text,
  period_to text,
  created_at timestamptz not null default now(),
  created_by uuid,
  is_active boolean not null default true
);

create index if not exists billing_penalty_rules_active_idx on billing_penalty_rules (is_active);
create index if not exists billing_penalty_rules_period_idx on billing_penalty_rules (period_from, period_to);

create table if not exists billing_penalty_exceptions (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid references plots(id) on delete set null,
  person_id uuid references persons(id) on delete set null,
  period text not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists billing_penalty_exceptions_plot_idx on billing_penalty_exceptions (plot_id, period);
create index if not exists billing_penalty_exceptions_person_idx on billing_penalty_exceptions (person_id, period);
