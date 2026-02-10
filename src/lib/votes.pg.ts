import { sql } from "@/db/client";

export type VoteStatus = "draft" | "open" | "closed";
export type QuorumType = "persons" | "plots";
export type VoteChoice = "yes" | "no" | "abstain";

export type Vote = {
  id: string;
  meetingId: string;
  agendaItemId: string;
  status: VoteStatus;
  opensAt: string | null;
  closesAt: string | null;
  quorumType: QuorumType;
  quorumRequired: number;
  createdAt: string;
  createdBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
};

export type VoteBallot = {
  id: string;
  voteId: string;
  userId: string;
  plotId: string | null;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
  source: string;
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const mapVote = (row: {
  id: string;
  meeting_id: string;
  agenda_item_id: string;
  status: VoteStatus;
  opens_at: string | null;
  closes_at: string | null;
  quorum_type: QuorumType;
  quorum_required: number | string;
  created_at: string;
  created_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
}): Vote => ({
  id: row.id,
  meetingId: row.meeting_id,
  agendaItemId: row.agenda_item_id,
  status: row.status,
  opensAt: row.opens_at,
  closesAt: row.closes_at,
  quorumType: row.quorum_type,
  quorumRequired: toNumber(row.quorum_required),
  createdAt: row.created_at,
  createdBy: row.created_by,
  closedAt: row.closed_at,
  closedBy: row.closed_by,
});

const mapBallot = (row: {
  id: string;
  vote_id: string;
  user_id: string;
  plot_id: string | null;
  choice: VoteChoice;
  source: string;
  created_at: string;
  updated_at: string;
}): VoteBallot => ({
  id: row.id,
  voteId: row.vote_id,
  userId: row.user_id,
  plotId: row.plot_id,
  choice: row.choice,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function createVote(input: {
  meetingId: string;
  agendaItemId: string;
  quorumType: QuorumType;
  quorumRequired: number;
  createdBy: string | null;
}) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      agenda_item_id: string;
      status: VoteStatus;
      opens_at: string | null;
      closes_at: string | null;
      quorum_type: QuorumType;
      quorum_required: number | string;
      created_at: string;
      created_by: string | null;
      closed_at: string | null;
      closed_by: string | null;
    }>
  >`
    insert into votes (meeting_id, agenda_item_id, status, quorum_type, quorum_required, created_by)
    values (${input.meetingId}, ${input.agendaItemId}, 'draft', ${input.quorumType}, ${input.quorumRequired}, ${input.createdBy})
    returning
      id,
      meeting_id,
      agenda_item_id,
      status,
      opens_at::text as opens_at,
      closes_at::text as closes_at,
      quorum_type,
      quorum_required,
      created_at::text as created_at,
      created_by,
      closed_at::text as closed_at,
      closed_by
  `;
  return mapVote(rows[0]);
}

export async function getVote(id: string): Promise<Vote | null> {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      agenda_item_id: string;
      status: VoteStatus;
      opens_at: string | null;
      closes_at: string | null;
      quorum_type: QuorumType;
      quorum_required: number | string;
      created_at: string;
      created_by: string | null;
      closed_at: string | null;
      closed_by: string | null;
    }>
  >`
    select
      id,
      meeting_id,
      agenda_item_id,
      status,
      opens_at::text as opens_at,
      closes_at::text as closes_at,
      quorum_type,
      quorum_required,
      created_at::text as created_at,
      created_by,
      closed_at::text as closed_at,
      closed_by
    from votes
    where id = ${id}
    limit 1
  `;
  return rows[0] ? mapVote(rows[0]) : null;
}

export async function listMeetingVotes(meetingId: string): Promise<Vote[]> {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      agenda_item_id: string;
      status: VoteStatus;
      opens_at: string | null;
      closes_at: string | null;
      quorum_type: QuorumType;
      quorum_required: number | string;
      created_at: string;
      created_by: string | null;
      closed_at: string | null;
      closed_by: string | null;
    }>
  >`
    select
      id,
      meeting_id,
      agenda_item_id,
      status,
      opens_at::text as opens_at,
      closes_at::text as closes_at,
      quorum_type,
      quorum_required,
      created_at::text as created_at,
      created_by,
      closed_at::text as closed_at,
      closed_by
    from votes
    where meeting_id = ${meetingId}
    order by created_at desc
  `;
  return rows.map(mapVote);
}

export async function openVote(id: string, userId: string | null) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      agenda_item_id: string;
      status: VoteStatus;
      opens_at: string | null;
      closes_at: string | null;
      quorum_type: QuorumType;
      quorum_required: number | string;
      created_at: string;
      created_by: string | null;
      closed_at: string | null;
      closed_by: string | null;
    }>
  >`
    update votes
    set status = 'open', opens_at = now(), closed_at = null, closed_by = null
    where id = ${id}
    returning
      id,
      meeting_id,
      agenda_item_id,
      status,
      opens_at::text as opens_at,
      closes_at::text as closes_at,
      quorum_type,
      quorum_required,
      created_at::text as created_at,
      created_by,
      closed_at::text as closed_at,
      closed_by
  `;
  return rows[0] ? mapVote(rows[0]) : null;
}

export async function closeVote(id: string, userId: string | null) {
  const rows = await sql<
    Array<{
      id: string;
      meeting_id: string;
      agenda_item_id: string;
      status: VoteStatus;
      opens_at: string | null;
      closes_at: string | null;
      quorum_type: QuorumType;
      quorum_required: number | string;
      created_at: string;
      created_by: string | null;
      closed_at: string | null;
      closed_by: string | null;
    }>
  >`
    update votes
    set status = 'closed', closes_at = now(), closed_at = now(), closed_by = ${userId}
    where id = ${id}
    returning
      id,
      meeting_id,
      agenda_item_id,
      status,
      opens_at::text as opens_at,
      closes_at::text as closes_at,
      quorum_type,
      quorum_required,
      created_at::text as created_at,
      created_by,
      closed_at::text as closed_at,
      closed_by
  `;
  return rows[0] ? mapVote(rows[0]) : null;
}

export async function castVote(input: {
  voteId: string;
  userId: string;
  plotId: string | null;
  choice: VoteChoice;
  source: string;
}) {
  if (input.plotId === null) {
    const rows = await sql<
      Array<{
        id: string;
        vote_id: string;
        user_id: string;
        plot_id: string | null;
        choice: VoteChoice;
        source: string;
        created_at: string;
        updated_at: string;
      }>
    >`
      insert into vote_ballots (vote_id, user_id, plot_id, choice, source)
      values (${input.voteId}, ${input.userId}, null, ${input.choice}, ${input.source})
      on conflict (vote_id, user_id) where plot_id is null
      do update set choice = excluded.choice, updated_at = now()
      returning
        id,
        vote_id,
        user_id,
        plot_id,
        choice,
        source,
        created_at::text as created_at,
        updated_at::text as updated_at
    `;
    return rows[0] ? mapBallot(rows[0]) : null;
  }

  const rows = await sql<
    Array<{
      id: string;
      vote_id: string;
      user_id: string;
      plot_id: string | null;
      choice: VoteChoice;
      source: string;
      created_at: string;
      updated_at: string;
    }>
  >`
    insert into vote_ballots (vote_id, user_id, plot_id, choice, source)
    values (${input.voteId}, ${input.userId}, ${input.plotId}, ${input.choice}, ${input.source})
    on conflict (vote_id, plot_id) where plot_id is not null
    do update set choice = excluded.choice, updated_at = now()
    returning
      id,
      vote_id,
      user_id,
      plot_id,
      choice,
      source,
      created_at::text as created_at,
      updated_at::text as updated_at
  `;
  return rows[0] ? mapBallot(rows[0]) : null;
}

export async function listBallots(voteId: string): Promise<VoteBallot[]> {
  const rows = await sql<
    Array<{
      id: string;
      vote_id: string;
      user_id: string;
      plot_id: string | null;
      choice: VoteChoice;
      source: string;
      created_at: string;
      updated_at: string;
    }>
  >`
    select
      id,
      vote_id,
      user_id,
      plot_id,
      choice,
      source,
      created_at::text as created_at,
      updated_at::text as updated_at
    from vote_ballots
    where vote_id = ${voteId}
    order by created_at desc
  `;
  return rows.map(mapBallot);
}

export async function computeVoteResults(voteId: string, quorumType: QuorumType, quorumRequired: number) {
  const ballots = await listBallots(voteId);
  const counts = ballots.reduce(
    (acc, ballot) => {
      acc[ballot.choice] += 1;
      return acc;
    },
    { yes: 0, no: 0, abstain: 0 },
  );

  let eligible = 0;
  if (quorumType === "plots") {
    const rows = await sql<Array<{ total: number }>>`
      select count(distinct plot_id)::int as total
      from plot_persons
    `;
    eligible = rows[0]?.total ?? 0;
  } else {
    const rows = await sql<Array<{ total: number }>>`
      select count(distinct person_id)::int as total
      from plot_persons
    `;
    eligible = rows[0]?.total ?? 0;
  }
  const turnout = eligible > 0 ? ballots.length / eligible : 0;
  return {
    counts,
    ballots: ballots.length,
    eligible,
    turnout,
    quorumMet: eligible > 0 ? turnout >= quorumRequired : false,
  };
}
