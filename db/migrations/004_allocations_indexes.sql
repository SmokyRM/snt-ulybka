create index if not exists billing_allocations_payment_id_idx on billing_allocations (payment_id);
create index if not exists billing_allocations_accrual_id_idx on billing_allocations (accrual_id);
create index if not exists billing_accruals_period_idx on billing_accruals (period);
