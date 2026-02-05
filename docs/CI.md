# CI Guide

## Что запускается на PR (`.github/workflows/ci.yml`)

1. `fast-checks`
- `npm ci`
- `npm run check:conflicts`
- `npm run db:migrations:check`
- `npm run security:secrets`
- `npm run security:scan`

2. `quality` (после fast-checks)
- `npm run lint -- --quiet`
- `npm run typecheck -- --pretty false`
- `npm test`

3. `build` (после quality)
- `npm run build`
- `npm run perf:budget`

4. `audit`
- `npm audit --omit=dev --audit-level=high` (блокирующий)

5. `smoke-quick` (после build)
- `npm start`
- `GET /api/health`
- `GET /`

CI использует безопасные фиктивные env:
- `SESSION_SECRET=ci-test-session-secret-32chars!!`
- `NEXT_PUBLIC_BUILD_TIME=2024-01-01T00:00:00Z`
- `FEATURE_QA_MODE=false`

## Nightly (`.github/workflows/nightly.yml`)

Запускается по расписанию (ежедневно) и вручную.

Содержит полный набор E2E/регрессий и сохраняет artifacts:
- Playwright report
- `test-results`
- лог Next.js

## Как повторить CI локально

Быстро:
```bash
npm run ci:local
```

По шагам:
```bash
npm ci
npm run check:conflicts
npm run db:migrations:check
npm run security:secrets
npm run security:scan
npm run lint -- --quiet
npm run typecheck -- --pretty false
npm test
npm run build
```

Smoke как в CI:
```bash
npm run build
PORT=3000 npm start &
npx wait-on http://127.0.0.1:3000/
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/ > /tmp/home.html
```

## Pre-commit

`.husky/pre-commit` запускает:
- `npm run check:conflicts`
- `npm run check:api-contracts`
- `npm run security:secrets`
- `npx lint-staged`
