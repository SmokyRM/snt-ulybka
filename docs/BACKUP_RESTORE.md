# Backup / Restore Playbook

## Требования
- Установлены PostgreSQL client tools: `pg_dump`, `psql`.
- Настроен `POSTGRES_URL` (или `DATABASE_URL`), для restore можно использовать `TARGET_POSTGRES_URL`.

## Создание backup
```bash
npm run db:backup
```

Опционально:
```bash
npm run db:backup -- --output=tmp/backups/prod-2026-02-05.sql
```

Скрипт использует:
- `POSTGRES_URL_NON_POOLING`
- иначе `POSTGRES_URL`
- иначе `DATABASE_URL`

## Восстановление backup
```bash
npm run db:restore -- --file=tmp/backups/prod-2026-02-05.sql --target-url="$TARGET_POSTGRES_URL"
```

Если `--target-url` не задан, скрипт возьмет `TARGET_POSTGRES_URL`, затем `POSTGRES_URL*`.

## Sanity-check после восстановления
```sql
select now();
select count(*) from plots;
select count(*) from persons;
select count(*) from billing_payments;
select count(*) from billing_accruals;
select count(*) from office_jobs;
```

Также доступен API-чек (только admin): `GET /api/admin/backup/check`.

## Политика хранения (рекомендация)
- Daily: хранить 7 дней.
- Weekly: хранить 30 дней.
- Monthly: хранить 90 дней.

## Безопасность
- Не сохраняйте backup в публичные bucket/репозитории.
- Не логируйте connection string.
- Тестируйте восстановление минимум раз в месяц на отдельной БД.
