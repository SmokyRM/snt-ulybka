-- Sprint 68 / Step 32: Notification campaigns & deliveries
create table if not exists notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  template_id uuid references notification_templates(id) on delete set null,
  segment jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'dry_run', 'scheduled', 'sending', 'done', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid,
  scheduled_for timestamptz,
  stats jsonb not null default '{"targeted":0,"sent":0,"failed":0}'::jsonb
);

create index if not exists notification_campaigns_status_idx on notification_campaigns (status);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references notification_campaigns(id) on delete cascade,
  user_id uuid,
  person_id uuid,
  plot_id uuid,
  channel text not null,
  recipient_masked text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_deliveries_campaign_id_idx on notification_deliveries (campaign_id);
create index if not exists notification_deliveries_status_idx on notification_deliveries (status);
