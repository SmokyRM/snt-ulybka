# CI/CD Pipeline

## Quick Start (Local)

```bash
npm ci
npm run lint -- --quiet
npm test
npm run build
npm run e2e:install
npm run e2e:smoke:ci
npm run e2e:office:ci
```

## E2E Smoke Tests

### Prerequisites

```bash
npm run e2e:install   # Install Playwright browsers
```

### Running E2E Smoke Suite

```bash
# Terminal 1: Start dev server
npm run dev -- --port 3000

# Terminal 2: Run smoke tests (waits for server)
npm run e2e:smoke
```

Or use single command with background server:

```bash
npm run e2e:smoke:ci
```

Office smoke (admin):

```bash
npm run e2e:office:ci
```

## CI Pipeline Order

```yaml
steps:
  - name: Install dependencies
    run: npm ci

  - name: Lint
    run: npm run lint -- --quiet

  - name: Unit tests
    run: npm test

  - name: Build
    run: npm run build

  - name: Install Playwright
    run: npm run e2e:install

  - name: Start server & run E2E
    run: npm run e2e:smoke:ci

  - name: Office smoke
    run: npm run e2e:office:ci
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run lint` | ESLint check |
| `npm test` | Unit tests (vitest) |
| `npm run build` | Production build |
| `npm run e2e:install` | Install Playwright browsers |
| `npm run e2e:smoke` | Run smoke E2E tests (requires dev server) |
| `npm run e2e:smoke:ci` | Run smoke E2E tests with managed dev server |
| `npm run e2e:office:ci` | Run office smoke tests with managed dev server |
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:matrix` | Run access matrix tests |
| `npm run prepare` | Install husky git hooks |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | Base URL for E2E tests | `http://localhost:3000` |
| `AUTH_PASS_ADMIN` | Admin password for staff login (credential-based) | - |
| `TEST_ACCESS_CODE` | Resident code for E2E tests | `1111` (dev default) |
| `DEV_LOGIN_CODE` | Custom resident code in dev mode | - |
| `USER_ACCESS_CODE` | Resident code in production | - |

**Note:** For code-based resident login, priority is: `TEST_ACCESS_CODE` > `DEV_LOGIN_CODE` > `USER_ACCESS_CODE` > `"1111"` (dev default).

In dev mode, the app accepts these built-in codes:
- `1111` → resident
- `1233` → admin
- `2222` → chairman
- `DEV_LOGIN_CODE` → resident (if set)

## Smoke Test Coverage

The `smoke-billing` projects include 4 tests:

1. **Staff login** - Verifies staff login redirects to `/admin` or `/office`
2. **Resident login** - Verifies resident login goes to `/cabinet` (never `/admin`)
3. **Cabinet appeals** - Creates an appeal in cabinet
4. **Admin billing import** - Verifies payments import UI renders correctly

## Troubleshooting

### Pre-commit checks fail

Pre-commit runs `npm run check:conflicts`, `npm run check:api-contracts`, and `lint-staged` (eslint on staged files). Fix the reported violations and re-commit.

### Tests timeout waiting for server

Ensure dev server is running on port 3000:

```bash
curl -s http://localhost:3000/api/healthz
```

### Login tests fail

Check that environment variables are set correctly in `.env.local`:

```bash
# For dev mode, use built-in codes:
AUTH_PASS_ADMIN=1233
TEST_ACCESS_CODE=1111
# Or AUTH_PASS_RESIDENT=1111
```

The Playwright config loads env via `@next/env`. If using custom codes, ensure they match what the app expects (`USER_ACCESS_CODE`, `DEV_LOGIN_CODE`, etc.).

### Playwright browsers not installed

```bash
npm run e2e:install
```
