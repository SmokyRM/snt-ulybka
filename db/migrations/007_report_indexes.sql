alter table billing_payments
  add column if not exists period text generated always as (to_char(paid_at, 'YYYY-MM')) stored;

create index if not exists billing_payments_period_created_at_idx
  on billing_payments (period, created_at);

create index if not exists billing_accruals_period_plot_id_idx
  on billing_accruals (period, plot_id);

create index if not exists plot_persons_plot_id_person_id_idx
  on plot_persons (plot_id, person_id);
