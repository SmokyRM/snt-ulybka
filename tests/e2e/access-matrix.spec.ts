import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

type Role = "resident" | "chairman" | "secretary" | "accountant" | "admin";
type Route = "/cabinet" | "/office" | "/admin" | "/admin/qa" | "/forbidden" | "/login" | "/staff-login";

type MatrixResult = {
  role: Role;
  route: Route;
  httpStatus: number | null;
  finalUrl: string;
  verdict: "OK" | "LOGIN" | "FORBIDDEN" | "NOT_FOUND" | "UNEXPECTED";
  testIdFound?: boolean;
  timestamp?: string;
  error?: string;
};

type MatrixReport = {
  version: string;
  timestamp: string;
  baseURL: string;
  results: MatrixResult[];
  summary: Record<Role, Record<Route, string>>;
  failures: Array<{
    role: Role;
    route: Route;
    finalUrl: string;
    verdict: string;
    httpStatus: number | null;
  }>;
};

const ROLES: Role[] = ["resident", "chairman", "secretary", "accountant", "admin"];
const ROUTES: Route[] = ["/cabinet", "/office", "/admin", "/admin/qa", "/forbidden", "/login", "/staff-login"];

const ROLE_TEST_IDS: Record<Route, string | null> = {
  "/cabinet": "cabinet-page-root",
  "/office": "office-root", // Office redirects to dashboard, but shell is always present
  "/admin": "admin-root",
  "/admin/qa": "qa-root",
  "/forbidden": "forbidden-root",
  "/login": "login-form",
  "/staff-login": "staff-login-root",
};

function getVerdict(
  status: number | null,
  finalUrl: string,
  route: Route,
  testIdFound: boolean
): MatrixResult["verdict"] {
  if (status === 200 && testIdFound) return "OK";
  if (status === 404) return "NOT_FOUND";
  if (status === 403 || finalUrl.includes("/forbidden")) return "FORBIDDEN";
  if (status === 401 || finalUrl.includes("/login") || finalUrl.includes("/staff-login")) return "LOGIN";
  return "UNEXPECTED";
}

async function checkRoute(page: Page, route: Route): Promise<MatrixResult> {
  let httpStatus: number | null = null;
  let finalUrl = route;
  let testIdFound = false;

  try {
    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    httpStatus = response?.status() ?? null;
    finalUrl = page.url().replace(baseURL, "");

    // Wait a bit for page to fully load
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
      // Ignore timeout
    });

    // Check for expected testId
    const expectedTestId = ROLE_TEST_IDS[route];
    if (expectedTestId) {
      try {
        testIdFound = await page.getByTestId(expectedTestId).isVisible({ timeout: 3000 });
      } catch {
        testIdFound = false;
      }
    } else {
      // For routes without specific testId, check if we're on the expected page
      testIdFound = finalUrl.startsWith(route) || finalUrl === route;
    }
  } catch (error) {
    // Network error or timeout
    httpStatus = null;
    finalUrl = route;
    testIdFound = false;
  }

  const verdict = getVerdict(httpStatus, finalUrl, route, testIdFound);

  return {
    role: "resident" as Role, // Will be set by caller
    route,
    httpStatus,
    finalUrl,
    verdict,
    testIdFound,
  };
}

// Global results array to collect across all test runs
const globalResults: MatrixResult[] = [];

test.describe("Access Matrix", () => {
  for (const role of ROLES) {
    const storageStatePath = path.join(__dirname, ".auth", `${role}.json`);
    const storageStateExists = fs.existsSync(storageStatePath);

    test.describe(`Role: ${role}`, () => {
      test.use({
        storageState: storageStateExists ? storageStatePath : undefined,
      });

      test.skip(!storageStateExists, `Storage state for ${role} not found. Run setup first.`);

      for (const route of ROUTES) {
        test(`check ${route}`, async ({ page }: { page: Page }) => {
          const result = await checkRoute(page, route);
          result.role = role;
          globalResults.push(result);

          // Log result for debugging
          console.log(`[${role}] ${route}: ${result.verdict} (${result.httpStatus || "—"}) → ${result.finalUrl}`);
        });
      }
    });
  }
});

// Save results after all tests complete
test.afterAll(async () => {
  // Save results to JSON file
  const resultsDir = path.join(process.cwd(), "test-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsPath = path.join(resultsDir, "access-matrix.json");
  fs.writeFileSync(resultsPath, JSON.stringify(globalResults, null, 2), "utf-8");
  console.log(`\nAccess matrix results saved to: ${resultsPath}`);

  // Also create a summary table
  const summary: Record<Role, Record<Route, string>> = {} as Record<Role, Record<Route, string>>;
  for (const role of ROLES) {
    summary[role] = {} as Record<Route, string>;
    for (const route of ROUTES) {
      const result = globalResults.find((r) => r.role === role && r.route === route);
      summary[role][route] = result?.verdict || "—";
    }
  }

  const summaryPath = path.join(resultsDir, "access-matrix-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`Access matrix summary saved to: ${summaryPath}`);
});
