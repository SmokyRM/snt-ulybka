create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'general',
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists meetings_status_starts_idx on meetings (status, starts_at desc);
create index if not exists meetings_published_idx on meetings (published_at desc);

create table if not exists meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  position int not null default 0,
  title text not null,
  description text,
  requires_vote boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meeting_agenda_items_meeting_idx on meeting_agenda_items (meeting_id, position);

create table if not exists meeting_materials (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  document_id uuid references office_documents(id) on delete set null,
  title text not null,
  visibility text not null default 'residents',
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists meeting_materials_meeting_idx on meeting_materials (meeting_id, created_at desc);

create table if not exists meeting_questions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id text not null,
  plot_id uuid references plots(id) on delete set null,
  question text not null,
  status text not null default 'new',
  answer text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by uuid
);

create index if not exists meeting_questions_meeting_idx on meeting_questions (meeting_id, created_at desc);
create index if not exists meeting_questions_status_idx on meeting_questions (status, created_at desc);
