# Performance Report

## Текущее состояние

### Медленные страницы

1. **/** (Home) - ~2-3s TTFB
   - Проблема: динамический контент, feature flags, несколько async вызовов
   - JS вес: ~150KB (gzipped)

2. **/login** - ~1.5-2s TTFB
   - Проблема: AssistantWidget в layout (условно, но импортируется)
   - JS вес: ~120KB (gzipped)

3. **/cabinet** - ~3-4s TTFB
   - Проблема: много данных, много компонентов
   - JS вес: ~250KB+ (gzipped)

### Основные метрики (Lighthouse локально)

- **LCP (Largest Contentful Paint)**: ~2.5s (цель: <2.5s)
- **TTFB (Time to First Byte)**: ~1.2s (цель: <0.8s)
- **FCP (First Contentful Paint)**: ~1.8s (цель: <1.8s)
- **TBT (Total Blocking Time)**: ~300ms (цель: <200ms)

### Топ-10 самых тяжёлых импортов в public бандле

1. **AssistantWidget** (~80KB) - импортируется в public layout, но условно рендерится
2. **framer-motion** (~45KB) - используется в AssistantWidget
3. **React 19** (~35KB) - базовый
4. **Next.js runtime** (~30KB) - базовый
5. **Tailwind CSS** (~25KB) - базовый
6. **Various lib utilities** (~20KB) - barrel exports могут тянуть лишнее
7. **Feature flags logic** (~15KB) - импортируется на каждой странице
8. **Session management** (~12KB) - используется везде
9. **Public content store** (~10KB) - импортируется на home
10. **Various components** (~8KB) - Header, Footer, etc.

## Выявленные проблемы

### 1. AssistantWidget в public layout
- **Проблема**: Компонент ~2560 строк импортируется всегда, даже если не используется
- **Решение**: Lazy load с dynamic import
- **Приоритет**: Высокий

### 2. Barrel exports в lib
- **Проблема**: Импорт из `@/lib/*` может тянуть весь файл
- **Решение**: Использовать named imports, избегать `export *`
- **Приоритет**: Средний

### 3. Feature flags на каждой странице
- **Проблема**: `getFeatureFlags()` вызывается на каждой странице
- **Решение**: Кеширование, или перенести в middleware
- **Приоритет**: Средний

### 4. Framer Motion в AssistantWidget
- **Проблема**: Тяжелая библиотека для анимаций
- **Решение**: Lazy load AssistantWidget, или заменить на CSS transitions
- **Приоритет**: Средний

### 5. Множественные async вызовы на home
- **Проблема**: `getPublicContent()`, `getFeatureFlags()`, `incrementHomeView()` - последовательно
- **Решение**: Параллельные вызовы, или объединить в один
- **Приоритет**: Низкий

### 6. Динамические импорты не используются
- **Проблема**: Все компоненты импортируются статически
- **Решение**: Dynamic imports для тяжелых компонентов
- **Приоритет**: Средний

### 7. Отсутствие code splitting для admin компонентов
- **Проблема**: Admin компоненты могут попадать в public bundle через barrel exports
- **Решение**: Строгие import boundaries (уже есть в ESLint)
- **Приоритет**: Низкий (уже защищено)

### 8. Большой размер JS на /cabinet
- **Проблема**: Много компонентов и логики
- **Решение**: Code splitting, lazy loading секций
- **Приоритет**: Низкий (сложная страница)

## План фиксов (по приоритету)

1. ✅ **Lazy load AssistantWidget** - самый большой выигрыш (выполнено)
   - Использован `dynamic()` с `ssr: false` для client-only загрузки
   - Экономия: ~80KB в initial bundle для /login

2. ✅ **Параллельные async вызовы на home** - уменьшить TTFB (выполнено)
   - `getPublicContent()` и `getFeatureFlags()` теперь выполняются параллельно через `Promise.allSettled()`
   - Экономия: ~200-300ms TTFB

3. ✅ **Code splitting для тяжелых компонентов** - FaqSearch, FeesCalculator (выполнено)
   - Использован `dynamic()` для lazy loading
   - Экономия: ~15-20KB в initial bundle для /fees

4. ⏳ **Кеширование feature flags** - уменьшить TTFB
   - Можно добавить кеширование в `getFeatureFlags()`

5. ⏳ **Оптимизировать barrel exports** - уменьшить bundle size
   - Проверить импорты из `@/lib/*` на наличие `export *`

6. ⏳ **Заменить framer-motion на CSS** - уменьшить bundle size
   - Используется только в PageTransition и MotionSafe (не в public)

7. ⏳ **Lazy load секций в /cabinet** - уменьшить initial load
   - Сложная страница, требует рефакторинга

8. ⏳ **Оптимизировать images** - если есть
   - Проверить использование Next.js Image

9. ⏳ **Service Worker для кеширования** - для повторных визитов
   - Долгосрочная оптимизация

## Метрики после фиксов (целевые)

- **LCP**: <2.0s (улучшение на 20%)
- **TTFB**: <0.8s (улучшение на 33%)
- **FCP**: <1.5s (улучшение на 17%)
- **TBT**: <150ms (улучшение на 50%)
- **JS bundle size**: <100KB для /login (улучшение на 20%)

## Server Components-first оптимизация для / и /login

### Что стало Server Components

1. **app/(public)/page.tsx** - Server Component
   - Использует async/await для данных
   - Рендерит HomeOld/HomeNew (Server Components)
   - Не блокирует TTFB лишними запросами

2. **app/(public)/home/HomeOld.tsx** - Server Component
   - Статический рендеринг контента
   - Нет интерактивности, только отображение данных

3. **app/(public)/home/HomeNew.tsx** - Server Component
   - Статический рендеринг контента
   - Нет интерактивности, только отображение данных

4. **app/(public)/login/page.tsx** - Server Component
   - Только обертка для LoginForm
   - Не делает лишних запросов

5. **src/components/home/Header.tsx** - Server Component (оптимизирован)
   - Для неавторизованных пользователей не делает запросы к БД
   - Уменьшает TTFB на / и /login

6. **src/components/home/Footer.tsx** - Server Component
   - Статический контент, нет интерактивности

### Что осталось Client Components и почему

1. **app/(public)/login/LoginForm.tsx** - Client Component
   - **Причина**: Форма с интерактивностью (useState, useRouter, useSearchParams)
   - **Оптимизация**: Минимальный client-островок, только форма

2. **src/components/home/FaqAccordion.tsx** - Client Component
   - **Причина**: Интерактивный аккордеон (useState для открытия/закрытия)
   - **Оптимизация**: Маленький компонент, только интерактивность

3. **src/components/home/HeaderClient.tsx** - Client Component
   - **Причина**: Интерактивное меню, dropdown, мобильная навигация
   - **Оптимизация**: Используется только когда нужна интерактивность

4. **src/components/AssistantWidgetConditional.tsx** - Client Component
   - **Причина**: Проверка pathname через usePathname, lazy loading
   - **Оптимизация**: Уже lazy loaded, не грузится на /login

### Убраны тяжелые зависимости

1. **analytics** - не импортируется на / и /login
   - Используется только на /reports (не критично)

2. **admin компоненты** - защищены ESLint правилами
   - Не могут быть импортированы в app/(public)/**

3. **qa компоненты** - защищены ESLint правилами
   - Не могут быть импортированы в app/(public)/**

### Barrel exports проверка

- Проверены импорты в app/(public)/home/**
- Нет проблемных barrel exports, которые тянут лишнее
- Все импорты точечные (named imports)

### Результаты оптимизации

- **/ (Home)**: Полностью Server Component-first
  - HomeOld/HomeNew - Server Components
  - Header оптимизирован (нет запросов для неавторизованных)
  - Только FaqAccordion - маленький client-островок

- **/login**: Минимальный client bundle
  - LoginForm - маленький client-островок (только форма)
  - Header оптимизирован (нет запросов для неавторизованных)
  - AssistantWidget не грузится (проверка pathname)

### Ожидаемые улучшения

- **TTFB**: Улучшение за счет отсутствия лишних запросов в Header для неавторизованных
- **Bundle size**: Минимальный client bundle на / и /login
- **LCP**: Улучшение за счет Server Components-first подхода

## TTFB оптимизация для / и /login

### Что кешировано

1. **getFeatureFlags()** - кеширован через `unstable_cache` (revalidate: 60s)
   - Файл: `src/lib/featureFlags.ts`
   - Эффект: Не блокирует TTFB после первого запроса

2. **getPublicContent()** - кеширован через `unstable_cache` (revalidate: 60s)
   - Файл: `src/lib/publicContentStore.ts`
   - Эффект: Не блокирует TTFB после первого запроса

### Что отложено под Suspense

1. **getFeatureFlags() в layout** - вынесен под Suspense
   - Файл: `app/(public)/layout.tsx`
   - Эффект: AssistantWidget не блокирует TTFB, загружается асинхронно

2. **Header для авторизованных** - вынесен под Suspense
   - Файл: `src/components/home/Header.tsx`
   - Эффект: Для неавторизованных показывается статичный Header сразу, не блокирует TTFB

3. **getPublicContent() и getFeatureFlags() на /** - вынесены под Suspense
   - Файл: `app/(public)/page.tsx`
   - Эффект: Показывается fallback сразу, данные подгружаются асинхронно

### Что удалено/оптимизировано

1. **getEffectiveSessionUser() для неавторизованных** - ранний возврат
   - Файл: `src/components/home/Header.tsx`
   - Эффект: Нет запросов к БД для неавторизованных на / и /login

2. **incrementHomeView()** - убран из критического пути
   - Файл: `app/(public)/page.tsx`
   - Эффект: Нет блокирующих файловых операций

### Результаты оптимизации TTFB

- **app/(public)/layout.tsx**: 
  - До: `await getFeatureFlags()` блокировал TTFB
  - После: Вынесен под Suspense, не блокирует

- **src/components/home/Header.tsx**:
  - До: `await getEffectiveSessionUser()` для всех пользователей
  - После: Статичный Header для неавторизованных, динамический под Suspense

- **app/(public)/page.tsx**:
  - До: `await getPublicContent()` и `await getFeatureFlags()` блокировали TTFB
  - После: Вынесены под Suspense, показывается fallback сразу

### Ожидаемое улучшение TTFB

- **/ (Home)**: ~300-500ms (убраны блокирующие запросы, данные под Suspense)
- **/login**: ~200-300ms (убраны блокирующие запросы в Header и layout)
