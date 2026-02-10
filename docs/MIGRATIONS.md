# Migrations Guide

## Формат файлов
- Папка: `db/migrations/`
- Имя: `NNN_description.sql` (`001_init.sql`, `012_perf_indexes.sql`)
- Нумерация строго по возрастанию, с leading zeros.

## Проверка миграций
```bash
npm run db:migrations:check
```

Проверка валидирует:
- формат имени,
- отсутствие дубликатов номера,
- корректный порядок файлов,
- предупреждает о пропусках в последовательности.

## Применение миграций локально
```bash
npm run db:migrate
```

Скрипт:
- читает `.env.local` при отсутствии DB env,
- использует `schema_migrations(filename, applied_at)`,
- применяет только неприменённые миграции,
- выполняет каждую миграцию в транзакции.

## Применение на production
1. Сделайте backup (`npm run db:backup`).
2. Запустите `npm run db:migrations:check`.
3. Запустите `npm run db:migrate` в окружении с production `POSTGRES_URL`.
4. Проверьте `GET /api/admin/backup/check`.

## Частые ошибки
- `POSTGRES_URL missing`: проверьте `POSTGRES_URL` / `DATABASE_URL`.
- `Duplicate migration number`: переименуйте конфликтующий файл.
- `Ordering mismatch`: используйте нумерацию `001..010..011`.
