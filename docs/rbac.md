# RBAC Matrix - Role-Based Access Control

## Роли

- **admin** - Администратор (полный доступ)
- **chairman** - Председатель (офис + управление)
- **secretary** - Секретарь (офис + обращения/объявления)
- **accountant** - Бухгалтер (офис + финансы)
- **resident** - Член СНТ (кабинет жителя)
- **guest** - Гость (публичные страницы)

## Матрица доступа к маршрутам

| Маршрут | guest | resident | chairman | secretary | accountant | admin |
|---------|-------|----------|----------|-----------|------------|-------|
| `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/staff/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/forbidden` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/cabinet/**` | ❌ → `/login?next=` | ✅ | ❌ → `/forbidden` | ❌ → `/forbidden` | ❌ → `/forbidden` | ❌ → `/forbidden` |
| `/office/**` | ❌ → `/staff/login?next=` | ❌ → `/forbidden` | ✅ | ✅ | ✅ | ✅ |
| `/admin/**` | ❌ → `/staff/login?next=` | ❌ → `/forbidden` | ❌ → `/forbidden` | ❌ → `/forbidden` | ❌ → `/forbidden` | ✅ |
| `/api/admin/**` | ❌ → 401 | ❌ → 403 | ❌ → 403 | ❌ → 403 | ❌ → 403 | ✅ |

## Логика редиректов

### Неавторизованные пользователи (guest)
- `/admin/**` → `/staff/login?next=/admin/...`
- `/office/**` → `/staff/login?next=/office/...`
- `/cabinet/**` → `/login?next=/cabinet/...`

### Авторизованные пользователи без доступа
- `resident` на `/admin/**` → `/forbidden`
- `resident` на `/office/**` → `/forbidden`
- `admin/chairman/secretary/accountant` на `/cabinet/**` → `/forbidden`

## Helpers в `src/lib/rbac.ts`

### Проверка ролей
- `normalizeRole(rawRole)` - нормализует роль из различных вариантов
- `isAdminRole(role)` - проверяет, является ли роль администратором
- `isOfficeRole(role)` - проверяет, является ли роль офисной (chairman/secretary/accountant/admin)
- `isResidentRole(role)` - проверяет, является ли роль жителем

### Assertions
- `assertAdminRole(role)` - выбрасывает ошибку, если роль не admin
- `assertOfficeRole(role)` - выбрасывает ошибку, если роль не office

### Permissions
- `hasPermission(role, permission)` - проверяет наличие разрешения
- `assertPermission(role, permission)` - выбрасывает ошибку, если нет разрешения
- `can(role, capability)` - проверяет capability (admin.access, office.access, cabinet.access)

### Утилиты
- `defaultPathForRole(role)` - возвращает путь по умолчанию для роли
- `getForbiddenReason(role, capability)` - возвращает причину запрета

## Примеры использования

```typescript
import { isAdminRole, isOfficeRole, assertAdminRole } from "@/lib/rbac";

// Проверка роли
if (isAdminRole(user.role)) {
  // доступ к админке
}

// Assertion (выбрасывает ошибку)
const adminRole = assertAdminRole(user.role);

// Проверка доступа
if (can(user.role, "admin.access")) {
  // доступ к админке
}
```
