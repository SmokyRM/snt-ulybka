# SLA v1 для обращений

## Обзор

SLA v1 определяет сроки выполнения обращений (dueAt) на основе их типа (категории). Тип обращения определяется автоматически через triage на основе ключевых слов в тексте.

## Хранение конфигурации

Конфигурация SLA хранится в файле **`src/lib/appealsSla.ts`**:

```typescript
export const DEFAULT_SLA_CONFIG_BY_TYPE: SlaConfigByType = {
  finance: 48,              // Взносы и оплата - 2 дня
  electricity: 24,           // Электроэнергия - 1 день
  documents: 72,             // Документы - 3 дня
  access: 12,                // Доступ/код - срочно, 12 часов
  membership: 72,            // Членство - 3 дня
  general: 72,               // Общее - 3 дня
  insufficient_data: 24,    // Недостаточно данных - 1 день
};
```

**Дефолт для неизвестных типов:** 72 часа

## Применение

### 1. При создании обращения

Функция `createAppeal()` в **`src/lib/appeals.store.ts`**:
- Автоматически определяет тип обращения через `triageAppeal()`
- Сохраняет тип в поле `appeal.type`
- Вычисляет `dueAt` на основе типа через `calculateDueAtByType()`

```typescript
// Auto-triage: определяем категорию
const triage = triageAppeal(newAppeal);
newAppeal.type = triage.category;

// Автоматически назначаем dueAt на основе типа обращения и SLA
newAppeal.dueAt = calculateDueAtByType(triage.category);
```

### 2. При обновлении статуса

Функция `updateAppealStatus()` обновляет `dueAt` при изменении статуса:
- Если есть тип обращения - использует его для расчета dueAt
- Если типа нет - использует legacy логику по статусу

### 3. Миграция существующих данных

Функция `getAppeal()` автоматически вычисляет тип для старых обращений:
- Если у обращения нет типа - вычисляет через triage
- Если нет dueAt - вычисляет на основе типа

## Схема данных

Поле `dueAt` добавлено в тип `Appeal` в **`src/lib/office/types.ts`**:

```typescript
export type Appeal = {
  // ... другие поля
  type?: AppealCategory;  // Тип обращения (категория из triage) для SLA
  dueAt?: string | null;  // Срок выполнения (ISO строка)
  // ...
};
```

Поле `type` опциональное для обратной совместимости со старыми данными.

## Тестирование

### Unit тесты

1. **`tests/unit/appealsSla.test.ts`** - тесты функций SLA:
   - Проверка расчета dueAt для каждого типа
   - Проверка дефолта для неизвестных типов
   - Проверка кастомной конфигурации

2. **`tests/unit/appealsSlaIntegration.test.ts`** - интеграционные тесты:
   - Проверка создания обращений с правильным dueAt
   - Проверка установки типа при создании
   - Проверка всех типов обращений

### Запуск тестов

```bash
npm run test -- tests/unit/appealsSla.test.ts
npm run test -- tests/unit/appealsSlaIntegration.test.ts
```

## Расширение конфигурации

Для добавления нового типа или изменения сроков:

1. Добавьте тип в `AppealCategory` в **`src/lib/office/types.ts`**
2. Добавьте правило в `CATEGORY_RULES` в **`src/lib/appealsTriage.ts`**
3. Добавьте срок в `DEFAULT_SLA_CONFIG_BY_TYPE` в **`src/lib/appealsSla.ts`**

Пример:

```typescript
// В appealsSla.ts
export const DEFAULT_SLA_CONFIG_BY_TYPE: SlaConfigByType = {
  // ... существующие типы
  new_type: 36, // Новый тип - 36 часов
};
```

## Обратная совместимость

- Поле `type` опциональное - старые обращения без типа продолжают работать
- Функция `calculateDueAt()` по статусу сохранена для legacy кода
- При чтении старых обращений тип вычисляется автоматически через triage
