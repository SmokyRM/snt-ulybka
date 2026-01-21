#!/bin/bash
# Скрипт для массового обновления проверок RBAC в роутах
# Заменяет старые проверки на новую утилиту checkAdminOrOfficeAccess

find app/api/admin/billing app/api/admin/electricity app/api/admin/expenses app/api/admin/targets -name "route.ts" -type f | while read file; do
  # Проверяем, есть ли в файле старые проверки
  if grep -q "hasAdminAccess(user) && !isOfficeRole\|hasFinanceAccess(user) && !isOfficeRole" "$file"; then
    echo "Updating $file..."
    
    # Заменяем импорты
    sed -i '' 's/import { getSessionUser, hasAdminAccess }/import { getSessionUser }/g' "$file"
    sed -i '' 's/import { getSessionUser, hasFinanceAccess }/import { getSessionUser }/g' "$file"
    sed -i '' 's/import { isOfficeRole, isAdminRole } from "@\/lib\/rbac";/import { checkAdminOrOfficeAccess } from "@\/lib\/rbac\/accessCheck";/g' "$file"
    
    # Если импорт checkAdminOrOfficeAccess еще не добавлен, добавляем его
    if ! grep -q "checkAdminOrOfficeAccess" "$file"; then
      # Добавляем после импорта getSessionUser
      sed -i '' '/import { getSessionUser }/a\
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
' "$file"
    fi
    
    # Заменяем проверки в функциях GET/POST/PUT/DELETE
    # Паттерн: проверка с && !isOfficeRole
    sed -i '' 's/if (!hasAdminAccess(user) && !isOfficeRole(user\.role) && !isAdminRole(user\.role)) {/const accessCheck = await checkAdminOrOfficeAccess(request);\
  if (!accessCheck.allowed) {\
    return NextResponse.json({ error: accessCheck.reason || "forbidden" }, { status: accessCheck.reason === "unauthorized" ? 401 : 403 });\
  }\
  \
  const user = await getSessionUser();\
\
  if (false) {/g' "$file"
    
    sed -i '' 's/if (!hasFinanceAccess(user) && !isOfficeRole(user\.role) && !isAdminRole(user\.role)) {/const accessCheck = await checkAdminOrOfficeAccess(request);\
  if (!accessCheck.allowed) {\
    return NextResponse.json({ error: accessCheck.reason || "forbidden" }, { status: accessCheck.reason === "unauthorized" ? 401 : 403 });\
  }\
  \
  const user = await getSessionUser();\
\
  if (false) {/g' "$file"
    
    # Удаляем старые проверки user и role
    sed -i '' '/const user = await getSessionUser();/{N;/if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });/d}' "$file"
    sed -i '' '/const role = user\.role;/d' "$file"
    sed -i '' '/if (false) {/{N;N;N;N;d}' "$file"
    
    echo "Updated $file"
  fi
done

echo "Done!"
