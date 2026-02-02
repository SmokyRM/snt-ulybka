create table if not exists notification_drafts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  send_at timestamptz,
  canceled_at timestamptz,
  idempotency_key text
);

create unique index if not exists notification_drafts_idempotency_key_idx
  on notification_drafts (idempotency_key)
  where idempotency_key is not null;

create index if not exists notification_drafts_status_idx on notification_drafts (status);
create index if not exists notification_drafts_send_at_idx on notification_drafts (send_at);

create table if not exists notification_journal (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references notification_drafts (id) on delete set null,
  recipient text not null,
  channel text not null,
  status text not null,
  error text,
  sent_at timestamptz,
  template_key text,
  rendered_text text,
  user_id uuid,
  plot_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists notification_journal_draft_id_idx on notification_journal (draft_id);
create index if not exists notification_journal_status_idx on notification_journal (status);
create index if not exists notification_journal_sent_at_idx on notification_journal (sent_at);
