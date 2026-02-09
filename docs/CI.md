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

## Пиннинг actions на SHA

Все GitHub Actions запиннены на конкретные commit SHA (не плавающие теги).
Это защита от supply-chain атак — тег `v4` может быть переписан, SHA нет.

Текущие версии:

| Action | Version | SHA |
|--------|---------|-----|
| `actions/checkout` | v4.3.1 | `34e114876b0b…` |
| `actions/setup-node` | v4.4.0 | `49933ea5288c…` |
| `actions/cache` | v4.3.0 | `0057852bfaa8…` |
| `actions/upload-artifact` | v4.6.2 | `ea165f8d65b6…` |

Чтобы обновить:
```bash
git ls-remote --tags https://github.com/actions/checkout.git 'refs/tags/v4.*' | sort -V | tail -1
# скопировать SHA, заменить в ci.yml и nightly.yml
```

## Почему VS Code ругается на `actions/*@sha` и что делать

VS Code (расширение GitHub Actions) может показывать ошибку
`Unable to resolve action 'actions/checkout@...', repository or version not found`.

**Это ложное срабатывание.** Workflow корректен и работает на GitHub Actions.

Причины:
1. **Не залогинен в GitHub** — расширение не может resolve SHA без API-доступа
2. **VPN/прокси** — блокирует запросы к api.github.com
3. **Устаревший кэш расширения** — SHA ещё не в локальном кэше
4. **Rate limit** — GitHub API возвращает 403

Как починить:
- `Cmd+Shift+P` → "GitHub Actions: Sign In" — залогиниться
- Перезагрузить VS Code (`Cmd+Shift+P` → "Reload Window")
- Проверить VPN/прокси — `curl -s https://api.github.com/rate_limit`
- Если не помогает — отключить расширение GitHub Actions (оно опционально)
