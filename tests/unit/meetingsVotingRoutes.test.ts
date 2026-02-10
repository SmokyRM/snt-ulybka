import { describe, it, expect, vi, beforeEach } from "vitest";

const getEffectiveSessionUser = vi.fn();
const getMeetingById = vi.fn();
const listAgendaItems = vi.fn();
const listMaterials = vi.fn();
const listQuestions = vi.fn();
const listMeetingVotes = vi.fn();
const hasPgConnection = vi.fn();
const createQuestion = vi.fn();
const answerQuestion = vi.fn();
const requirePermission = vi.fn();
const getVote = vi.fn();
const castVote = vi.fn();
const getUserPlots = vi.fn();

vi.mock("@/lib/session.server", () => ({
  getEffectiveSessionUser,
}));

vi.mock("@/lib/meetings.pg", () => ({
  getMeetingById,
  listAgendaItems,
  listMaterials,
  listQuestions,
  listMeetingVotes,
  hasPgConnection,
  createQuestion,
  answerQuestion,
}));

vi.mock("@/lib/votes.pg", () => ({
  listMeetingVotes,
  getVote,
  castVote,
}));

vi.mock("@/lib/plots", () => ({
  getUserPlots,
}));

vi.mock("@/lib/permissionsGuard", () => ({
  requirePermission,
}));

describe("Meetings & voting routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPgConnection.mockReturnValue(true);
    getEffectiveSessionUser.mockResolvedValue({ id: "user-1", role: "resident" });
  });

  it("resident cannot see draft meeting (404)", async () => {
    getMeetingById.mockResolvedValue({ id: "meeting-1", status: "draft" });
    const { GET } = await import("../../app/api/cabinet/meetings/[id]/route");
    const request = new Request("http://localhost/api/cabinet/meetings/meeting-1");
    const response = await GET(request, { params: Promise.resolve({ id: "meeting-1" }) });
    expect(response.status).toBe(404);
  });

  it("resident cannot submit question for non-published meeting (404)", async () => {
    getMeetingById.mockResolvedValue({ id: "meeting-1", status: "draft" });
    const { POST } = await import("../../app/api/cabinet/meetings/[id]/questions/route");
    const request = new Request("http://localhost/api/cabinet/meetings/meeting-1/questions", {
      method: "POST",
      body: JSON.stringify({ question: "?" }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: "meeting-1" }) });
    expect(response.status).toBe(404);
  });

  it("office can answer meeting question", async () => {
    requirePermission.mockResolvedValue({ session: { id: "staff-1", role: "chairman" } });
    answerQuestion.mockResolvedValue({ id: "q1", status: "answered" });
    const { POST } = await import("../../app/api/office/meetings/[id]/questions/[qid]/answer/route");
    const request = new Request("http://localhost/api/office/meetings/meeting-1/questions/q1/answer", {
      method: "POST",
      body: JSON.stringify({ answer: "ok" }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: "meeting-1", qid: "q1" }) });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("resident cannot cast vote after close (409)", async () => {
    getVote.mockResolvedValue({ id: "vote-1", status: "closed", quorumType: "persons" });
    const { POST } = await import("../../app/api/cabinet/votes/[id]/cast/route");
    const request = new Request("http://localhost/api/cabinet/votes/vote-1/cast", {
      method: "POST",
      body: JSON.stringify({ choice: "yes" }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: "vote-1" }) });
    expect(response.status).toBe(409);
  });

  it("resident cannot vote with чужим plotId (404)", async () => {
    getVote.mockResolvedValue({ id: "vote-1", status: "open", quorumType: "plots" });
    getUserPlots.mockResolvedValue([]);
    const { POST } = await import("../../app/api/cabinet/votes/[id]/cast/route");
    const request = new Request("http://localhost/api/cabinet/votes/vote-1/cast", {
      method: "POST",
      body: JSON.stringify({ choice: "yes", plotId: "plot-999" }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: "vote-1" }) });
    expect(response.status).toBe(404);
  });
});
