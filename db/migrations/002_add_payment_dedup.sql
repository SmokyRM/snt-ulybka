alter table billing_payments
  add column if not exists source text default 'import',
  add column if not exists external_id text,
  add column if not exists raw_row_hash text,
  add column if not exists plot_ref text;

create unique index if not exists billing_payments_source_external_id_idx
  on billing_payments (source, external_id)
  where external_id is not null;

create unique index if not exists billing_payments_raw_row_hash_idx
  on billing_payments (raw_row_hash)
  where raw_row_hash is not null;
