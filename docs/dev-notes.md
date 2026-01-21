# Заметки для разработки

## Правило: функции нельзя прокидывать из Server в Client

**Server Components** не могут передавать в **Client Components** пропы-функции (`onClick`, `onAction`, `handler`, `onSubmit` и т.п.) — они не сериализуются, возникает runtime-ошибка: *"Event handlers cannot be passed to Client Component props"*.

### Что делать вместо этого

1. **Навигация по ссылке**  
   Передавать только `actionHref` (и при необходимости `actionLabel`), рендерить `<Link href={actionHref}>` или кнопку, ведущую по `href`, внутри Server- или Client-компонента.

2. **Минимальная Client-обёртка**  
   Вынести интерактивный блок (кнопка с `onClick`, форма с `onSubmit`) в отдельный компонент с `"use client"`. В него с сервера передавать только сериализуемые данные (строки, числа, объекты без функций). Обработчики объявлять и вызывать только внутри Client-компонента.

3. **Server Action**  
   Если действие по смыслу серверное (сохранение, удаление, etc.) — оформить его как **Server Action** (`"use server"`). Такие функции можно передавать из Server в Client как ссылку; в пропы передаётся не обычная функция, а серверный action.

### Примеры

**Плохо (Server Component):**
```tsx
// page.tsx — Server, без "use client"
<EmptyState onAction={() => window.location.href = "/new"} />  // ❌
<button onClick={() => confirm("Удалить?")}>Удалить</button>   // ❌
```

**Хорошо — ссылка (Server):**
```tsx
<EmptyStateCard actionLabel="Создать" actionHref="/admin/targets/new" />
```

**Хорошо — Client-обёртка для handler:**
```tsx
// Server: page.tsx
<DeleteTemplateButton deleteAction={deleteAction} templateId={id} />

// Client: DeleteTemplateButton.tsx "use client"
// deleteAction — Server Action, можно передавать; onClick — только внутри Client
<button onClick={(e) => { if (!confirm("Удалить?")) e.preventDefault(); }}>…</button>
```

**Хорошо — Server Action в пропах:**
```tsx
// saveAction, resetAction — с "use server"
<PublicContentEditorClient onSave={saveAction} onReset={resetAction} />
```

### Где искать проблемы

- В `app/**/page.tsx` и `app/**/layout.tsx` **без** `"use client"`:  
  `onAction=`, `onClick=`, `onSubmit=`, `handler=`, и т.п., если значение — функция или её вызов.
- Исключение: `action={serverAction}` у `<form>` и передача **Server Action** в Client — допустимы.
