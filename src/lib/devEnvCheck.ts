/**
 * Dev-time проверка переменных окружения AUTH_PASS_*
 * Выводит предупреждения о недостающих переменных без раскрытия значений
 *
 * ВАЖНО: Не импортируется в production коде, только для dev режима
 */

const AUTH_PASS_VARS = [
  "AUTH_PASS_ADMIN",
  "AUTH_PASS_CHAIRMAN",
  "AUTH_PASS_SECRETARY",
  "AUTH_PASS_ACCOUNTANT",
  "AUTH_PASS_RESIDENT",
] as const;

/**
 * Проверяет наличие AUTH_PASS_* переменных и выводит предупреждения
 * Вызывается только в development режиме
 */
export function checkAuthPassVars(): void {
  // Проверяем только в dev режиме
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of AUTH_PASS_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === "") {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  }

  // Выводим результаты проверки
  if (missing.length > 0) {
    console.warn("\n[dev-check] ⚠ Missing AUTH_PASS_* variables:");
    for (const varName of missing) {
      console.warn(`  - ${varName}`);
    }
    console.warn("[dev-check] These roles will return 503 on login attempt.");
    console.warn("[dev-check] Add them to .env.local (see docs/DEVELOPMENT.md)\n");
  }

  if (present.length > 0) {
    console.log("[dev-check] ✓ Found AUTH_PASS_* variables:");
    for (const varName of present) {
      // НЕ печатаем значения паролей, только факт наличия
      console.log(`  - ${varName} is set`);
    }
  }

  if (missing.length === 0 && present.length > 0) {
    console.log("[dev-check] ✅ All AUTH_PASS_* variables are configured\n");
  }
}
