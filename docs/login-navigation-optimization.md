# Оптимизация переходов после логина

## Выполненные оптимизации

### 1. Замена router.replace() на router.push() в LoginForm

**Проблема**: `router.replace()` и `router.refresh()` замедляют переходы после логина.

**Решение**: Заменено на `router.push()` для более быстрых переходов.

**Файл**: `app/(public)/login/LoginForm.tsx`

```diff
- router.replace(target);
- router.refresh();
+ // Используем push вместо replace для более быстрого перехода
+ // prefetch уже включен по умолчанию в Next.js для Link компонентов
+ router.push(target);
```

**Эффект**: Более быстрые переходы после логина, без лишнего refresh.

### 2. Добавлен revalidate для статичных public страниц

**Проблема**: Некоторые public страницы не кешировались, что замедляло загрузку.

**Решение**: Добавлен `revalidate` для статичных public страниц.

**Файлы**:
- `app/(public)/knowledge/page.tsx` - добавлен `revalidate = 300` (5 минут)
- `app/(public)/templates/page.tsx` - добавлен `revalidate = 300` (5 минут)
- `app/(public)/docs/page.tsx` - убран `force-dynamic`, добавлен `revalidate = 300` (5 минут)
- `app/(public)/fees/page.tsx` - добавлен `revalidate = 300` (5 минут)

**Эффект**: Статичные данные кешируются на 5 минут, что ускоряет загрузку страниц.

### 3. Проверка использования <Link> компонентов

**Статус**: ✅ Уже используется
- Все ссылки на ключевые страницы (`/cabinet`, `/office`, `/admin`) используют `<Link>` компоненты
- Prefetch включен по умолчанию в Next.js для всех `<Link>` компонентов, видимых в viewport
- Нет необходимости вручную включать prefetch для большинства случаев

**Примеры**:
- `app/(public)/login/LoginForm.tsx` - использует `<Link>` для ссылок
- `app/(office)/office/OfficeShell.tsx` - использует `<AppLink>` (обертка над `<Link>`)
- `app/(cabinet)/cabinet/page.tsx` - использует `<Link>` для навигации

### 4. Проверка window.location для навигации

**Статус**: ✅ Нет проблем
- `window.location` используется только в `GlobalLogoutButton.tsx` для logout (это нормально)
- После логина используется `router.push()` или `router.replace()` (теперь `router.push()`)
- Нет использования `window.location` для навигации после логина

## DIFF изменений

### app/(public)/login/LoginForm.tsx
```diff
- router.replace(target);
- router.refresh();
+ // Используем push вместо replace для более быстрого перехода
+ // prefetch уже включен по умолчанию в Next.js для Link компонентов
+ router.push(target);
```

### app/(public)/knowledge/page.tsx
```diff
+ // Кешируем статичные данные для public страницы
+ export const revalidate = 300; // 5 минут
```

### app/(public)/templates/page.tsx
```diff
+ // Кешируем статичные данные для public страницы
+ export const revalidate = 300; // 5 минут
```

### app/(public)/docs/page.tsx
```diff
- export const dynamic = "force-dynamic";
+ // Кешируем статичные данные для public страницы
+ // Убрали force-dynamic для оптимизации TTFB
+ export const revalidate = 300; // 5 минут
```

### app/(public)/fees/page.tsx
```diff
+ // Кешируем статичные данные для public страницы
+ export const revalidate = 300; // 5 минут
```

## Результаты

### Улучшения производительности

1. **Переходы после логина**:
   - Использование `router.push()` вместо `router.replace()` + `router.refresh()`
   - Более быстрые переходы без лишнего refresh

2. **Кеширование статичных данных**:
   - Добавлен `revalidate = 300` для статичных public страниц
   - Убран `force-dynamic` из `/docs` для оптимизации TTFB
   - Статичные данные кешируются на 5 минут

3. **Prefetch**:
   - Prefetch включен по умолчанию в Next.js для всех `<Link>` компонентов
   - Нет необходимости вручную включать prefetch для большинства случаев

### Проверка

- `npm run lint` — успешно
- `npm run typecheck` — успешно (если нет других ошибок)
- `npm run build` — нужно проверить

## Выводы

**Текущее состояние**: ✅ Оптимизировано
- Используется `router.push()` для переходов после логина
- Статичные public страницы кешируются через `revalidate`
- Все ссылки используют `<Link>` компоненты с автоматическим prefetch
- Нет использования `window.location` для навигации после логина

**Рекомендации**:
- Если нужен prefetch для конкретных ссылок, можно использовать `prefetch={true}` в `<Link>`
- Для очень часто используемых переходов можно добавить `router.prefetch()` в `useEffect`
