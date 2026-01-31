import fs from "fs/promises";
import path from "path";
import { seedTestData } from "../src/lib/seedTestData";
import { getMockDbSnapshot, upsertUserById } from "../src/lib/mockDb";
import { saveMockDbToFile } from "../src/lib/mockDbFile";

const ensureEnv = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed e2e fixtures in production.");
  }
  if (process.env.ALLOW_SEED_TEST_DATA !== "true") {
    throw new Error(
      "Set ALLOW_SEED_TEST_DATA=true to run the seed. Example: ALLOW_SEED_TEST_DATA=true npm run seed:e2e"
    );
  }
};

const writeJson = async (fileName: string, value: unknown) => {
  const filePath = path.join(process.cwd(), "data", fileName);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
};

const seedFinanceHistory = async () => {
  const rows = [
    { userId: "user-resident-default", month: "2025-01", charged: 5000, paid: 5000 },
    { userId: "user-resident-default", month: "2025-02", charged: 5000, paid: 2500 },
    { userId: "user-resident-default", month: "2025-03", charged: 5200, paid: 0 },
    { userId: "user-resident-default", month: "2025-04", charged: 5200, paid: 5200 },
    { userId: "user-resident-default", month: "2025-05", charged: 5400, paid: 2700 },
  ];
  await writeJson("finance-history.json", rows);
};

const seedLegacyAppeals = async () => {
  const now = new Date().toISOString();
  const rows = [
    {
      id: "e2e-appeal-1",
      userId: "user-resident-default",
      createdAt: now,
      updatedAt: now,
      topic: "Общее",
      message: "E2E: тестовое обращение",
      status: "new",
      adminReply: null,
      updatedBy: "user-resident-default",
      updatedByRole: null,
      statusUpdatedAt: now,
      repliedAt: null,
      unreadByUser: false,
    },
  ];
  await writeJson("appeals.json", rows);
};

const run = async () => {
  ensureEnv();
  await seedTestData();
  upsertUserById({
    id: "user-resident-default",
    fullName: "Житель Тестовый",
    email: "resident@example.com",
    phone: "+7 900 333-33-33",
    role: "resident",
    status: "verified",
  });
  const snapshot = getMockDbSnapshot();
  if (snapshot) {
    await saveMockDbToFile(snapshot);
  }
  await seedFinanceHistory();
  await seedLegacyAppeals();
};

run()
  .then(() => {
    console.log("E2E fixtures seeded");
  })
  .catch((error) => {
    console.error("E2E seed failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
