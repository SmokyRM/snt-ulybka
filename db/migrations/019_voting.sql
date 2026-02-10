create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  agenda_item_id uuid not null references meeting_agenda_items(id) on delete cascade,
  status text not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  quorum_type text not null default 'persons',
  quorum_required numeric not null default 0.5,
  created_at timestamptz not null default now(),
  created_by uuid,
  closed_at timestamptz,
  closed_by uuid
);

create index if not exists votes_meeting_status_idx on votes (meeting_id, status);
create index if not exists votes_agenda_idx on votes (agenda_item_id);

create table if not exists vote_ballots (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes(id) on delete cascade,
  user_id text not null,
  plot_id uuid references plots(id) on delete set null,
  choice text not null,
  source text not null default 'cabinet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vote_ballots_vote_user_uidx
  on vote_ballots (vote_id, user_id)
  where plot_id is null;

create unique index if not exists vote_ballots_vote_plot_uidx
  on vote_ballots (vote_id, plot_id)
  where plot_id is not null;

create index if not exists vote_ballots_vote_idx on vote_ballots (vote_id, created_at desc);
