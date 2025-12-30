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
