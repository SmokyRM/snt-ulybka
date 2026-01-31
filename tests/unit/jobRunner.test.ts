import { describe, expect, it } from "vitest";
import { createAppeal, sendAppealReplyToResident, listOutbox } from "@/lib/appeals.store";
import { runOutboxJob } from "@/server/jobs";

describe("job runner", () => {
  it("processes outbox items", async () => {
    const beforeSent = listOutbox("sent").length;
    const appeal = await createAppeal({
      title: "E2E seed appeal",
      body: "Тестовое обращение",
      authorId: "user-resident-default",
    });
    const reply = sendAppealReplyToResident(
      appeal.id,
      { text: "Ответ для теста", channelPlanned: "site" },
      "secretary",
    );
    expect(reply).not.toBeNull();

    const result = await runOutboxJob();
    expect(result.ok).toBe(true);
    const afterSent = listOutbox("sent").length;
    expect(afterSent).toBeGreaterThan(beforeSent);
  });
});
