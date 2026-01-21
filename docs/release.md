# Release Checklist

## Pre-release

### 1. Код и тесты
- [ ] Все изменения закоммичены и запушены
- [ ] `npm run lint` — без ошибок
- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run check:conflicts` — без конфликтов
- [ ] `npm run test` — все unit тесты проходят
- [ ] `npm run test:matrix` — все E2E тесты проходят
- [ ] `npm run build` — сборка успешна

### 2. Документация
- [ ] Обновлен CHANGELOG (если нужно)
- [ ] Проверена документация RBAC (`docs/rbac.md`)
- [ ] Проверены UAT сценарии (`docs/uat.md`)

### 3. Environment Variables
- [ ] Проверены все необходимые env переменные
- [ ] `NODE_ENV=production` для production
- [ ] `ENABLE_QA` не установлен в production (или явно `false`)
- [ ] Проверены секреты (AUTH_PASS_*, TEST_*_CODE)

## Release

### 1. Deployment
- [ ] Создать release branch из `main` или `dev`
- [ ] Запустить deployment pipeline
- [ ] Дождаться успешного деплоя
- [ ] Проверить что приложение запустилось

### 2. Smoke Tests
- [ ] Проверить главную страницу `/`
- [ ] Проверить `/login` и `/staff/login`
- [ ] Проверить что редиректы работают
- [ ] Проверить что `/admin/qa` скрыт в production

### 3. Post-release
- [ ] Мониторинг ошибок (первые 30 минут)
- [ ] Проверка логов на наличие критических ошибок
- [ ] Уведомление команды о релизе

## Rollback Plan

### Если обнаружены критические ошибки:

1. **Быстрый rollback:**
   - [ ] Откатить deployment на предыдущую версию
   - [ ] Проверить что предыдущая версия работает
   - [ ] Уведомить команду

2. **Анализ проблемы:**
   - [ ] Собрать логи ошибок
   - [ ] Воспроизвести проблему локально (если возможно)
   - [ ] Создать issue с описанием проблемы

3. **Hotfix (если нужно):**
   - [ ] Создать hotfix branch
   - [ ] Исправить проблему
   - [ ] Прогнать все проверки
   - [ ] Задеплоить hotfix
   - [ ] Проверить что проблема решена

## Environment Variables Reference

### Production
```bash
NODE_ENV=production
ENABLE_QA=  # не установлен или false
```

### Development
```bash
NODE_ENV=development
ENABLE_QA=true  # для QA режима
```

### Required Secrets
- `AUTH_PASS_ADMIN` - пароль администратора
- `AUTH_PASS_CHAIRMAN` - пароль председателя
- `AUTH_PASS_SECRETARY` - пароль секретаря
- `AUTH_PASS_ACCOUNTANT` - пароль бухгалтера
- `TEST_ACCESS_CODE` - код доступа для тестов (resident)
- `TEST_ADMIN_CODE` - код доступа для тестов (admin)

## Monitoring

### Health Checks

**Endpoint:** `/api/healthz`

Проверяет состояние приложения:
- Доступность БД (ping + простая выборка)
- Наличие обязательных env переменных
- Общее состояние компонентов

**Формат ответа:**
```json
{
  "ok": true,
  "time": "2025-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "commit": "abc123",
  "uptimeSeconds": 3600,
  "components": {
    "database": {
      "ok": true,
      "latencyMs": 2
    },
    "environment": {
      "ok": true
    }
  },
  "latencyMs": 5
}
```

**Использование:**
- Настроить мониторинг (UptimeRobot, Pingdom и т.д.) на `/api/healthz`
- Проверять каждые 1-5 минут
- Алерт если `ok: false` или `status >= 503`

### Structured Logging

Все логи структурированы в JSON формате (production) или читаемом формате (dev).

**Формат лога:**
```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "level": "info|warn|error|debug",
  "path": "/api/auth/login",
  "role": "admin",
  "userId": "user-123",
  "action": "login|logout|forbidden|rbac_deny|api_request",
  "status": 200,
  "latencyMs": 45,
  "requestId": "uuid-here",
  "message": "Login successful"
}
```

**Логируемые события:**
- Auth: login, logout, forbidden, rbac_deny
- API: все запросы с path, method, role, userId, status, latency

**Мониторинг логов:**
- Настроить сбор логов (Vercel Logs, CloudWatch, Datadog и т.д.)
- Фильтровать по `level: "error"` для критических ошибок
- Отслеживать `latencyMs` для выявления медленных запросов
- Анализировать `rbac_deny` для выявления проблем с доступом

### Error Tracking (Sentry)

**Настройка:**
1. Установить переменные окружения:
   ```bash
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

2. В dev режиме (опционально):
   ```bash
   SENTRY_ENABLED=true
   NEXT_PUBLIC_SENTRY_ENABLED=true
   ```

**Что отслеживается:**
- Server-side ошибки (500+)
- Client-side ошибки (unhandled exceptions)
- API ошибки с контекстом (path, role, userId, requestId)

**Фильтрация:**
- Dev-only ошибки автоматически игнорируются
- Секретные данные (passwords, tokens) маскируются
- Sampling: 10% в production, 100% в dev

**Мониторинг Sentry:**
- Настроить алерты на новые ошибки
- Отслеживать частоту ошибок по endpoint
- Анализировать ошибки по ролям пользователей

### Key Metrics

**Мониторить:**
- Response time (p50, p95, p99) по endpoint
- Error rate (4xx, 5xx) по endpoint
- Auth events (login success/failure rate)
- RBAC denies (для выявления проблем доступа)
- Database latency

**Инструменты:**
- Vercel Analytics (встроенный)
- Sentry Performance Monitoring
- Custom dashboards (Grafana, Datadog)

## Backup/Restore

### Database Backup

**Текущая реализация:** In-memory mock DB (глобальное состояние)

**Backup стратегия:**
1. **Автоматический backup:**
   - В dev режиме: сохранение в `data/mockdb.json` при изменениях
   - В production: периодический экспорт через API (если реализовано)

2. **Ручной backup:**
   ```bash
   # Экспорт данных через API (если доступен)
   curl https://your-domain.com/api/admin/export/db > backup-$(date +%Y%m%d).json
   ```

3. **Vercel/Platform backup:**
   - Использовать встроенные backup механизмы платформы
   - Настроить автоматические snapshots (если доступно)

### Restore Procedure

1. **Подготовка:**
   - [ ] Остановить приложение (если возможно)
   - [ ] Создать backup текущего состояния
   - [ ] Подготовить backup файл для восстановления

2. **Восстановление:**
   ```bash
   # В dev режиме: заменить data/mockdb.json
   cp backup-20250101.json data/mockdb.json
   
   # Перезапустить приложение
   npm run dev
   ```

3. **В production:**
   - [ ] Использовать API для импорта данных (если реализовано)
   - [ ] Или восстановить через platform-specific механизмы

4. **Проверка:**
   - [ ] Проверить `/api/healthz` - должно быть `ok: true`
   - [ ] Проверить ключевые endpoints
   - [ ] Проверить что данные восстановлены корректно

### Backup Checklist

**Ежедневно:**
- [ ] Проверить что backup механизмы работают
- [ ] Проверить размер backup файлов
- [ ] Проверить доступность backup хранилища

**Еженедельно:**
- [ ] Тестировать restore процедуру на тестовой среде
- [ ] Проверить целостность backup данных
- [ ] Обновить документацию restore процедуры (если изменилась)

**Перед major release:**
- [ ] Создать полный backup текущего состояния
- [ ] Сохранить backup в безопасном месте
- [ ] Документировать состояние перед release

## Post-release Monitoring

### Первые 24 часа:
- [ ] Мониторинг ошибок в логах
- [ ] Проверка `/api/healthz` каждые 5 минут
- [ ] Мониторинг Sentry на новые ошибки
- [ ] Проверка метрик производительности
- [ ] Проверка доступности всех ключевых страниц
- [ ] Сбор feedback от пользователей

### Первая неделя:
- [ ] Анализ использования новых функций
- [ ] Проверка стабильности (error rate, latency)
- [ ] Анализ RBAC denies (если есть проблемы)
- [ ] Сбор метрик для следующего релиза
- [ ] Обзор логов на аномалии