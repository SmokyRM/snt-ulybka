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

## Post-release Monitoring

### Первые 24 часа:
- [ ] Мониторинг ошибок в логах
- [ ] Проверка метрик производительности
- [ ] Проверка доступности всех ключевых страниц
- [ ] Сбор feedback от пользователей

### Первая неделя:
- [ ] Анализ использования новых функций
- [ ] Проверка стабильности
- [ ] Сбор метрик для следующего релиза
