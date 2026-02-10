-- Sprint 68 / Step 33: User notifications with read receipts
create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null,
  source_type text not null default 'system'
    check (source_type in ('campaign', 'system', 'ticket', 'billing')),
  source_id uuid,
  channel text,
  link text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_idx on user_notifications (user_id);
create index if not exists user_notifications_user_read_idx on user_notifications (user_id, read_at)
  where read_at is null;
create index if not exists user_notifications_source_idx on user_notifications (source_type, source_id);
