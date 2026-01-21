# Диагностический отчёт проекта

## 1. Dependency Sanity ✅
- **npm install**: Успешно (807 packages)
- **Peer dependencies**: @sentry/nextjs@10.34.0 совместим с next@16.1.1
- **Vulnerabilities**: 14 (3 low, 3 moderate, 8 high) - не критично для dev

## 2. Static Checks

### Lint Errors (12 ошибок)

#### Критические (блокируют сборку):
1. **app/(office)/office/inbox/InboxClient.tsx:8** - импорт "server-only" модуля в client component
   - Причина: `getRegistryUrl` из `registryLinks.ts` помечен как "server-only", но используется в клиентском компоненте
   - Фикс: Вынести логику в API route или убрать "server-only" если не требуется

#### React Hooks (setState в useEffect):
2. **app/(office)/office/appeals/[id]/AppealActivityFeed.tsx:232** - setState в useEffect
3. **app/(public)/staff-login/StaffLoginDiagnostics.tsx:65** - setState в useEffect
4. **app/admin/billing/fee-tariffs/FeeTariffsClient.tsx:307** - setState в useEffect
5. **app/admin/billing/fee-tariffs/[id]/overrides/TariffOverridesClient.tsx:233** - setState в useEffect
6. **app/admin/billing/notifications/TemplateDialog.tsx:21** - setState в useEffect

#### Другие:
7. **app/(office)/office/appeals/[id]/page.tsx:74** - prefer-const (actionTemplates)
8. **app/(public)/register/RegisterClient.tsx:217** - react/no-unescaped-entities (2 места)
9. **app/admin/billing/accruals/AccrualsClient.tsx:361,373** - react/no-unescaped-entities (2 места)
10. **app/admin/_components/QaMatrixCard.tsx:629** - react-hooks/rules-of-hooks (условный useState)
11. **app/admin/billing/debts/DebtsClient.tsx:118,124** - @typescript-eslint/no-explicit-any (2 места)

### TypeScript Errors (13 ошибок)

#### Критические (блокируют сборку):
1. **src/lib/office/registryLinks.ts** - "server-only" в client component (build error)
2. **next.config.ts:17** - `turbopackPersistentCaching` не существует в ExperimentalConfig
3. **sentry.server.config.ts:84-86** - `nodeProfilingIntegration` не существует в @sentry/nextjs

#### Типы:
4. **app/admin/registry/BulkMergeModal.tsx:39** - phone: `string | null | undefined` vs `string | null`
5. **app/admin/templates/page.tsx** - возможно null (8 мест: user, session, allowedRolesStr)
6. **src/lib/mockDb.ts:220** - дубликат свойства `debtRepaymentPlans`
7. **src/lib/qa/seedScenarios.ts:76** - "system" не входит в тип роли
8. **src/lib/qa/seedScenarios.ts:260,327** - `null` не присваивается `string | undefined`

### Script Errors:
- **check:conflicts** - скрипт сломан (JSON.stringify в shell command)

## 3. Build/Runtime Checks

### Build Errors:
1. **src/lib/office/registryLinks.ts** - "server-only" импортируется в client component
   - Файл: `app/(office)/office/inbox/InboxClient.tsx:8`
   - Ошибка: "You're importing a component that needs 'server-only'"

## 4. React Loop Диагностика

Потенциальные проблемы (требуют runtime проверки):
- AppealActivityFeed.tsx:232 - setState в useEffect без правильных зависимостей
- StaffLoginDiagnostics.tsx:65 - setState в useEffect
- FeeTariffsClient.tsx:307 - setState в useEffect
- TariffOverridesClient.tsx:233 - setState в useEffect
- TemplateDialog.tsx:21 - setState в useEffect

## 5. Routing/Next 16

✅ **Исправлено ранее**: 
- `app/admin/registry/[personId]` → `app/admin/registry/people/[personId]`
- `app/admin/registry/[plotId]` → `app/admin/registry/plots/[plotId]`

## 6. Admin Nav Integrity

✅ **Защита добавлена**: Проверка дублей href в AdminSidebar.tsx:241-252

## План фиксов по приоритету

### Приоритет 1 (Критические - блокируют сборку):
1. ✅ Исправить импорт "server-only" в InboxClient.tsx
2. ✅ Исправить next.config.ts (убрать несуществующее свойство)
3. ✅ Исправить sentry.server.config.ts (убрать nodeProfilingIntegration)

### Приоритет 2 (TypeScript ошибки):
4. ✅ Исправить BulkMergeModal.tsx (phone type)
5. ✅ Исправить app/admin/templates/page.tsx (null checks)
6. ✅ Исправить src/lib/mockDb.ts (дубликат свойства)
7. ✅ Исправить src/lib/qa/seedScenarios.ts (типы)

### Приоритет 3 (Lint warnings):
8. ✅ Исправить setState в useEffect (5 файлов)
9. ✅ Исправить prefer-const, no-unescaped-entities, any types
10. ✅ Исправить react-hooks/rules-of-hooks

### Приоритет 4 (Scripts):
11. ✅ Исправить check:conflicts скрипт
