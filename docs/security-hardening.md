# Security Hardening

## Open Redirect Protection

### Overview

Защита от open redirect атак реализована через функцию `sanitizeNextUrl`, которая валидирует параметр `next` перед использованием в редиректах.

### Implementation

Функция `sanitizeNextUrl` находится в `src/lib/sanitizeNext.ts` и применяется во всех местах, где используется параметр `next` для редиректов:

- `app/(public)/login/LoginForm.tsx` - редирект после входа жителя
- `app/(public)/staff-login/StaffLoginForm.tsx` - редирект после входа сотрудника
- `app/(public)/staff-login/page.tsx` - валидация параметра next из URL
- `app/api/auth/login/route.ts` - валидация в API endpoint
- `middleware.ts` - валидация при редиректах на страницы логина

### Rules

Функция `sanitizeNextUrl` разрешает только:
- Относительные пути, начинающиеся с "/"
- Пути, не начинающиеся с "//" (protocol-relative URLs)

Функция отклоняет:
- Протоколы (http:, https:, javascript:, etc.)
- Protocol-relative URLs (//evil.com)
- Backslash (\\)
- Encoded "//" (%2F%2F, %2f%2f)

### Testing

Тесты находятся в `tests/unit/sanitizeNextUrl.test.ts` и покрывают:
- Разрешенные пути: `/cabinet`, `/office/dashboard`
- Запрещенные пути: `https://evil.com`, `//evil.com`, `%2F%2Fevil.com`, `\\evil`, `http:evil`

## Import Boundaries

### Overview

Для предотвращения случайного импорта административных компонентов в публичные страницы настроены ESLint правила.

### Configuration

В `eslint.config.mjs` для файлов в `app/(public)/**` запрещены импорты:
- `app/admin/**`
- `src/components/admin/**`

Это предотвращает утечку административного функционала в публичные страницы.

### Enforcement

ESLint автоматически проверяет эти правила при запуске `npm run lint`.
