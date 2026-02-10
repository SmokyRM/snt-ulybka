create table if not exists board_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'normal',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  assigned_to uuid,
  meeting_id uuid references meetings(id) on delete set null,
  agenda_item_id uuid references meeting_agenda_items(id) on delete set null,
  closed_at timestamptz,
  closed_by uuid,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists board_tasks_status_due_idx on board_tasks (status, due_at);
create index if not exists board_tasks_assigned_idx on board_tasks (assigned_to, status);
create index if not exists board_tasks_meeting_idx on board_tasks (meeting_id);

create table if not exists board_task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references board_tasks(id) on delete cascade,
  author_id uuid,
  author_role text,
  message text not null,
  status_to text,
  created_at timestamptz not null default now()
);

create index if not exists board_task_updates_task_idx on board_task_updates (task_id, created_at desc);
