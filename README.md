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

Prod = ветка `main`, разработка = `dev`. Один шаг для прод-деплоя:

```bash
npm run deploy
```

Что делает скрипт:
- мерджит локальный `dev` → `main`, пушит `main` (при необходимости создаёт пустой коммит для триггера);
- выводит SHA, который ушёл в `main`;
- запускает Vercel prod deploy через CLI.

Требуемые переменные (см. `.env.example`):
- `VERCEL_TOKEN` — получить через `vercel login` → `vercel tokens create`;
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — узнать через `vercel whoami`, `vercel project ls` или `vercel link`;
- при необходимости `VERCEL_SCOPE`.

Проверка: после команды видно `🚀 Production SHA (main): <sha>` и лог Vercel CLI с URL деплоя.

### Dry-run и защита от лишних деплоев
- `npm run deploy:dry` — выводит план действий без push/merge/deploy. Полезно для проверки перед релизом.
- Скрипт хранит последний задеплоенный SHA в `.vercel/last_deploy_sha`. Если текущий SHA совпадает с ним, деплой пропускается, чтобы не тратить лимит Vercel. Файл создаётся автоматически после успешного деплоя.
# snt-ulybka
