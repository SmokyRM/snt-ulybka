import { describe, expect, it } from "vitest";
import { validateMigrationFiles } from "../../scripts/lib/migrations-check.mjs";

describe("db migrations checker", () => {
  it("detects duplicate migration numbers", () => {
    const result = validateMigrationFiles([
      "001_init.sql",
      "002_add_users.sql",
      "002_add_indexes.sql",
    ]);

    expect(result.errors.some((error) => error.includes("Duplicate migration number"))).toBe(true);
  });

  it("passes for strictly ordered migration list", () => {
    const result = validateMigrationFiles(
      ["001_init.sql", "002_registry.sql", "003_billing.sql"],
      { requireSequential: true },
    );

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
