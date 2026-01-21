This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Production deploy

Prod = ветка `main`, разработка = `dev`. Vercel деплоит автоматически:
- push в `dev` → Preview
- push в `main` → Production

Локальная проверка перед пушем (без Vercel CLI):

```bash
npm run deploy
```

Что делает скрипт:
- прогоняет lint/typecheck/build;
- выводит сведения о текущем коммите/ветке/окружении, не выполняя git push и не вызывая Vercel CLI.
Примечание: в dev можно использовать Turbopack, но `npm run build` всегда запускается без него (webpack).

Требуемые переменные (см. `.env.example`):
- `VERCEL_TOKEN` — получить через `vercel login` → `vercel tokens create`;
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — узнать через `vercel whoami`, `vercel project ls` или `vercel link`;
- при необходимости `VERCEL_SCOPE`.

Проверка: после команды видно `🚀 Production SHA (main): <sha>` и лог Vercel CLI с URL деплоя.

### Dry-run
- `npm run deploy:dry` — выводит информацию о текущем коммите/ветке без каких-либо git/Vercel действий.

### Админ-фичи и build-info
- ENV-флаг `ADMIN_FEATURE_NEW_UI=1` + cookie `admin_feature_new_ui=1` включает новый UI в админке (переключатель на странице `/admin/build-info`).
- Страница `/admin/build-info` показывает текущее окружение/commit SHA/ветку/DEPLOYMENT_ID и позволяет включить фичу через cookie.

## Deploy workflow
- Работа ведётся в ветке `dev`; push в `dev` даёт Preview-деплой в Vercel.
- Релиз в прод: merge `dev` → `main` и push `main` (можно через `npm run deploy`, который сделает merge/push и проверки локально).
- Проверить задеплоенный SHA и окружение можно на странице `/admin/build-info`.

## Переменные окружения / E2E

### Установка

Для запуска E2E тестов нужно сначала установить браузеры Playwright:

```bash
npm install
npx playwright install --with-deps
```

### Переменные окружения

См. `.env.example` для полного списка переменных. Скопируйте его в `.env.local` и заполните реальными значениями:

```bash
cp .env.example .env.local
# Отредактируйте .env.local
```

#### Базовые переменные (опционально, есть значения по умолчанию)

- `PLAYWRIGHT_BASE_URL` — URL приложения (по умолчанию `http://localhost:3000`)
- `TEST_ACCESS_CODE` — код доступа для тестового входа жителя (по умолчанию `1111`)
- `TEST_ADMIN_CODE` — код доступа для тестового входа администратора (по умолчанию `1233`)

#### Креды для staff ролей (AUTH_PASS_*)

Для входа на `/staff-login` и `/staff/login` (**обязательно для dev**):

- `AUTH_PASS_ADMIN` — пароль администратора (логин: админ, admin)
- `AUTH_PASS_CHAIRMAN` — пароль председателя
- `AUTH_PASS_SECRETARY` — пароль секретаря
- `AUTH_PASS_ACCOUNTANT` — пароль бухгалтера

Если нужная переменная не задана, при попытке входа появится **«Код доступа не настроен»** (а не «Неверный логин или пароль»). Подробнее: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Для E2E с staff ролями также: `AUTH_USER_CHAIRMAN`, `AUTH_USER_SECRETARY`, `AUTH_USER_ACCOUNTANT`.

#### QA режим

Для доступа к QA инструментам (`/admin/qa`) требуется:

- **В dev/staging окружении**: QA доступен автоматически (не требуется дополнительных переменных)
- **В production окружении**: необходимо установить `ENABLE_QA=true`

Пример для локальной разработки:

```bash
# В dev режиме QA доступен автоматически
npm run dev

# Для явного включения QA (например, в staging)
ENABLE_QA=true npm run dev
```

**Важно**: В production QA функции недоступны по умолчанию и требуют явного включения через `ENABLE_QA=true` для безопасности.

**Переменные окружения для QA:**

- `ENABLE_QA=true` - включает QA функции в production (в dev доступны автоматически)
- `QA_SECRET` (опционально) - секретный ключ для доступа к QA endpoints без admin сессии

Пример `.env.local` (минимум для dev — задайте хотя бы `AUTH_PASS_ADMIN`):

```bash
# AUTH_PASS_* — для /staff-login (обязательно в dev)
AUTH_PASS_ADMIN=your_admin_password
AUTH_PASS_CHAIRMAN=your_password_here
AUTH_PASS_SECRETARY=your_password_here
AUTH_PASS_ACCOUNTANT=your_password_here

PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_ACCESS_CODE=1111
TEST_ADMIN_CODE=1233

AUTH_USER_CHAIRMAN=председатель
AUTH_USER_SECRETARY=секретарь
AUTH_USER_ACCOUNTANT=бухгалтер
```

### Запуск тестов

```bash
npm run test:e2e        # Запуск всех тестов (ожидает, что dev-сервер уже запущен)
npm run test:e2e:ui     # Запуск с UI (интерактивный режим)
npx playwright test tests/e2e/access-roles.spec.ts  # Запуск конкретного файла
```

### Рекомендуемый сценарий для стабильных E2E (без Turbopack)

В одном терминале поднимаем dev-сервер без Turbopack:

```bash
npm run clean          # Очистка .next/.turbo кешей (опционально)
npm run dev:e2e        # next dev --webpack (Next 16, без Turbopack)
```

Во втором терминале запускаем тесты, указывая baseURL:

```bash
npm run test:e2e       # PLAYWRIGHT_BASE_URL=http://localhost:3000 playwright test
```

Такой режим исключает конкуренцию за `.next/dev/lock` и проблемы Turbopack/ChunkLoadError.

### Поведение тестов accountant

- **Локально**: если креды accountant (`AUTH_USER_ACCOUNTANT`, `AUTH_PASS_ACCOUNTANT`) не заданы, тесты accountant будут пропущены (skipped)
- **В CI** (`process.env.CI === "true"`): если креды accountant не заданы, тесты accountant упадут с явной ошибкой — это гарантирует, что CI не будет зелёным "случайно" при отсутствии кредов

## QA reports

QA отчёты и шаблоны для тестирования админских QA инструментов:

- [QA Reports Directory](docs/qa/) — папка с QA документацией
- [Latest QA Report](docs/qa/QA_REPORT_admin_qa.md) — последний отчёт по тестированию админских QA инструментов
- [QA Template](docs/qa/QA_TEMPLATE_admin_qa.md) — шаблон для будущих прогонов
- Generate report: `npm run qa:report` (writes to `docs/qa/runs/`)
- **Note:** Generated reports and screenshots in `docs/qa/runs/` are local artifacts and not committed to git

## Assistant API (MVP)
POST `/api/assistant` возвращает справку по ключевым словам и контексту страницы.

Примеры:

```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"как импортировать платежи","pageContext":{"path":"/admin/billing/import"},"role":"admin"}'
```

```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"как получить доступ","pageContext":{"path":"/help"},"role":"member"}'
```
# snt-ulybka
