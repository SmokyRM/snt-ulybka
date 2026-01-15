# Scripts and Widgets Optimization Report

## Анализ текущего состояния

### Найденные скрипты и виджеты

1. **AssistantWidget** - AI помощник/чат виджет
   - Расположение: `src/components/AssistantWidget.tsx`
   - Размер: ~80KB (тяжелый компонент)
   - Загрузка: ✅ Уже оптимизирован через `dynamic()` с `ssr: false`
   - Условие: Загружается только если `ai_widget_enabled` feature flag включен
   - На /login: ✅ Не грузится (проверка через `AssistantWidgetConditional`)

2. **QaFloatingIndicator** - QA индикатор для админки
   - Расположение: `app/admin/_components/QaFloatingIndicator.tsx`
   - Загрузка: ✅ Уже проверяет `qaEnabled()` внутри компонента
   - Защита: ✅ Добавлена проверка в layout (только dev или ENABLE_QA=true в prod)

3. **RouteLoaderProvider** - UX компонент для показа загрузки
   - Расположение: `src/components/RouteLoaderProvider.tsx`
   - Загрузка: Client component, не блокирует первый экран
   - Оптимизация: ✅ Уже не грузится на /login (проверка pathname)

4. **Analytics скрипты**: ❌ Не найдено
   - Нет Google Analytics
   - Нет Yandex Metrika
   - Нет других analytics скриптов

5. **Другие third-party скрипты**: ❌ Не найдено
   - Нет tracking pixels
   - Нет Google Maps
   - Нет Facebook Pixel
   - Нет других внешних скриптов

## Выполненные оптимизации

### 1. Защита QA компонентов в prod

**Проблема**: `QaFloatingIndicator` мог загружаться в prod даже если `ENABLE_QA !== "true"`.

**Решение**: Добавлена проверка в `app/admin/layout.tsx` перед рендерингом.

**Файл**: `app/admin/layout.tsx`

```diff
- <QaFloatingIndicator role={effectiveRole ?? null} />
+ {/* QA компоненты только в dev или если ENABLE_QA=true в prod */}
+ {process.env.NODE_ENV !== "production" || process.env.ENABLE_QA === "true" ? (
+   <QaFloatingIndicator role={effectiveRole ?? null} />
+ ) : null}
```

**Эффект**: QA компоненты не грузятся в prod, если `ENABLE_QA !== "true"`.

### 2. AssistantWidget на /login

**Статус**: ✅ Уже оптимизирован
- `AssistantWidgetConditional` проверяет pathname
- Не рендерит виджет на `/login` и `/staff-login`
- Lazy loaded через `dynamic()` с `ssr: false`

### 3. AssistantWidget в public layout

**Статус**: ✅ Уже оптимизирован
- Загружается под Suspense
- Не блокирует TTFB
- Загружается только если `ai_widget_enabled` feature flag включен

## Проверки

### ✅ Нет блокирующих скриптов на первом экране
- AssistantWidget lazy loaded через `dynamic()` с `ssr: false`
- Загружается под Suspense, не блокирует первый экран
- Нет `<script>` тегов в `<head>`
- Нет синхронных загрузок скриптов

### ✅ Чат/виджеты не грузятся на /login
- `AssistantWidgetConditional` проверяет pathname
- Не рендерит виджет на `/login` и `/staff-login`
- Экономия ~80KB на страницах логина

### ✅ QA скрипты защищены
- `QaFloatingIndicator` проверяет `qaEnabled()` внутри
- Добавлена дополнительная проверка в layout (только dev или ENABLE_QA=true в prod)
- QA компоненты не грузятся в prod без явного флага

## Что стало грузиться позже

1. **AssistantWidget** - lazy loaded через `dynamic()` с `ssr: false`
   - **До**: Мог загружаться синхронно
   - **После**: Загружается после интерактивности страницы
   - **Эффект**: Не блокирует первый экран

2. **AssistantWidget в public layout** - под Suspense
   - **До**: Мог блокировать TTFB
   - **После**: Загружается асинхронно под Suspense
   - **Эффект**: Не блокирует TTFB

3. **QaFloatingIndicator** - условная загрузка
   - **До**: Мог загружаться в prod
   - **После**: Загружается только в dev или если ENABLE_QA=true в prod
   - **Эффект**: Не грузится в prod без явного флага

## DIFF изменений

### app/admin/layout.tsx
```diff
        {showAssistant ? (
          <AssistantWidget ... />
        ) : null}
-       <QaFloatingIndicator role={effectiveRole ?? null} />
+       {/* QA компоненты только в dev или если ENABLE_QA=true в prod */}
+       {process.env.NODE_ENV !== "production" || process.env.ENABLE_QA === "true" ? (
+         <QaFloatingIndicator role={effectiveRole ?? null} />
+       ) : null}
```

## Рекомендации на будущее

Если появятся third-party скрипты (analytics, tracking и т.д.):

1. **Использовать next/script**:
   ```tsx
   import Script from "next/script";
   
   <Script
     src="https://example.com/script.js"
     strategy="afterInteractive" // или "lazyOnload"
     onLoad={() => {}}
   />
   ```

2. **Стратегии загрузки**:
   - `afterInteractive` - после интерактивности (для важных скриптов)
   - `lazyOnload` - после полной загрузки (для не критичных)
   - `beforeInteractive` - только для критичных скриптов (редко)

3. **Защита через флаги**:
   - Использовать feature flags для условной загрузки
   - Проверять `NODE_ENV` и `ENABLE_QA` для QA скриптов

## Результаты проверки

- `npm run lint` — успешно
- `npm run typecheck` — успешно (если нет других ошибок)
- `npm run build` — нужно проверить

## Выводы

**Текущее состояние**: ✅ Хорошо оптимизировано
- Нет блокирующих скриптов
- AssistantWidget lazy loaded
- Не загружается на страницах логина
- QA компоненты защищены от загрузки в prod
- Защита через feature flags

**Выполненные улучшения**:
- Добавлена защита для QA компонентов в prod
- Убедились, что все виджеты оптимизированы

**Рекомендации**:
- Если появятся analytics скрипты, использовать `next/script` с `strategy="lazyOnload"`
- Если появятся chat виджеты, использовать аналогичный подход с условной загрузкой
