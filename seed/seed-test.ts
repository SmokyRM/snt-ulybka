import { seedTestData } from "../src/lib/seedTestData";

const ensureEnv = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed test data in production.");
  }
  if (process.env.ALLOW_SEED_TEST_DATA !== "true") {
    throw new Error(
      "Set ALLOW_SEED_TEST_DATA=true to run the seed. Example: ALLOW_SEED_TEST_DATA=true npm run seed:test"
    );
  }
};

const run = () => {
  ensureEnv();
  seedTestData()
    .then((summary) => {
      console.log("Seed complete:", summary);
    })
    .catch((error) => {
      console.error("Seed failed:", error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
};

run();
