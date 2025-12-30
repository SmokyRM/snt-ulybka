# Test seed data

This folder contains fixtures and a seed script to populate a reproducible dataset for the admin "Finances" area.

## How to run

```bash
ALLOW_SEED_TEST_DATA=true npm run seed:test
```

Notes:
- The script refuses to run in production.
- It uses the current mock DB utilities. If the app is already running, restart the dev server after seeding.

## What it creates

- 30 plots with mixed membership status and contacts
- Two owners with 2+ plots each
- Accrual period 2025-01 (membership_fee)
- Payments: 3 full, 2 partial, 5 unpaid
  - Total accrued: 50,000
  - Total paid: 17,500
  - Total debt: 32,500
  - Debtors: 7 plots

## Fixtures

Located in `seed/test-data/`:
- `plots.csv` (30 plots)
- `test_payments_valid.csv`
- `test_payments_invalid.csv`
- `test_payments_large.csv` (100 rows)
