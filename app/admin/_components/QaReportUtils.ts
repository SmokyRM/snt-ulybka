/**
 * Утилиты для генерации стандартизированных QA отчётов
 * Все тексты на русском языке
 */

export type EnvInfo = {
  NODE_ENV: string | undefined;
  ENABLE_QA: string | undefined;
  NEXT_PUBLIC_APP_VERSION?: string;
  GIT_SHA?: string;
};

export type SessionSnapshot = {
  role?: string;
  userId?: string;
  isQaOverride?: boolean;
};

export type CheckResult = {
  name: string;
  url: string;
  status: number | null;
  statusText: string;
  timeMs: number;
  error?: string;
};

export type DeadendResult = {
  route: string;
  issue: string;
  details: string;
  finalUrl?: string;
  redirectCount?: number;
};

export type MatrixResult = Record<
  string,
  Record<
    string,
    {
      status: string;
      httpStatus: number | null;
      finalUrl: string;
      redirectTo?: string;
      isRedirect?: boolean;
      expected?: string;
      actual?: string;
      matchesExpected?: boolean;
    }
  >
>;

/**
 * Форматирует дату/время в русском формате
 */
export function formatDateTime(date: Date = new Date()): string {
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Генерирует стандартизированный блок метаданных для отчёта
 */
export function formatMetadata(
  envInfo: EnvInfo,
  sessionSnapshot: SessionSnapshot,
  currentUrl: string,
  timestamp: Date = new Date()
): string {
  return `## Метаданные

**Дата/время:** ${formatDateTime(timestamp)}
**URL:** ${currentUrl}

### Окружение

- **NODE_ENV:** ${envInfo.NODE_ENV || "—"}
- **ENABLE_QA:** ${envInfo.ENABLE_QA || "—"}
${envInfo.NEXT_PUBLIC_APP_VERSION ? `- **APP_VERSION:** ${envInfo.NEXT_PUBLIC_APP_VERSION}` : ""}
${envInfo.GIT_SHA ? `- **GIT_SHA:** ${envInfo.GIT_SHA}` : ""}

### Сессия

- **Роль:** ${sessionSnapshot.role || "—"}
- **ID пользователя:** ${sessionSnapshot.userId || "—"}
- **QA Override:** ${sessionSnapshot.isQaOverride ? "да" : "нет"}`;
}

/**
 * Форматирует результаты проверок (checks)
 */
export function formatChecksResults(checksResults: CheckResult[] | null | undefined): string {
  if (!checksResults || checksResults.length === 0) {
    return "### Результаты проверок\n\nПроверки ещё не запущены.";
  }

  const lines = ["### Результаты проверок\n"];
  checksResults.forEach((check) => {
    const status = check.status !== null ? `${check.status} ${check.statusText}` : "Ошибка";
    const error = check.error ? ` — ${check.error}` : "";
    lines.push(`- **${check.name}** (\`${check.url}\`): ${status} (${check.timeMs} мс)${error}`);
  });
  return lines.join("\n");
}

/**
 * Форматирует результаты матрицы доступов
 */
export function formatMatrixResults(matrixResults: MatrixResult | null | undefined): string {
  if (!matrixResults) {
    return "### Результаты матрицы доступов\n\nМатрица ещё не запущена.";
  }

  const lines = ["### Результаты матрицы доступов\n"];
  lines.push("Матрица была запущена. Подробности см. в QA кабинете.");

  // Добавляем секцию с несовпадениями ожиданий
  const mismatches: Array<{
    role: string;
    route: string;
    expected: string;
    actual: string;
    finalUrl: string;
  }> = [];

  for (const [role, routes] of Object.entries(matrixResults)) {
    for (const [route, cell] of Object.entries(routes)) {
      if (cell.matchesExpected === false && cell.expected && cell.actual) {
        mismatches.push({
          role,
          route,
          expected: cell.expected,
          actual: cell.actual,
          finalUrl: cell.finalUrl || route,
        });
      }
    }
  }

  if (mismatches.length > 0) {
    lines.push("\n### Несовпадения ожиданий\n");
    mismatches.forEach((mismatch) => {
      lines.push(
        `- **${mismatch.role}** → \`${mismatch.route}\`: Ожидалось "${mismatch.expected}", получилось "${mismatch.actual}" (финальный URL: ${mismatch.finalUrl})`
      );
    });
  } else {
    lines.push("\n### Несовпадения ожиданий\n\nНесовпадений не обнаружено. Все результаты соответствуют ожиданиям.");
  }

  return lines.join("\n");
}

/**
 * Форматирует результаты проверки тупиков
 */
export function formatDeadendsResults(deadendResults: DeadendResult[] | null | undefined): string {
  if (!deadendResults || deadendResults.length === 0) {
    return "### Результаты проверки тупиков\n\nТупики не найдены или проверка ещё не запущена.";
  }

  const lines = ["### Результаты проверки тупиков\n"];
  deadendResults.forEach((result) => {
    const finalUrl = result.finalUrl ? ` (→ ${result.finalUrl})` : "";
    const redirects = result.redirectCount !== undefined ? ` [${result.redirectCount} редиректов]` : "";
    lines.push(`- **${result.route}**: ${result.issue} — ${result.details}${finalUrl}${redirects}`);
  });
  return lines.join("\n");
}

/**
 * Генерирует краткую версию отчёта (5-10 строк) для чата
 */
export function formatShortReport(
  title: string,
  envInfo: EnvInfo,
  sessionSnapshot: SessionSnapshot,
  currentUrl: string,
  summary?: string
): string {
  const lines = [
    `**${title}**`,
    `Дата: ${formatDateTime()}`,
    `URL: ${currentUrl}`,
    `Роль: ${sessionSnapshot.role || "—"}`,
    `Env: ${envInfo.NODE_ENV || "—"}`,
  ];
  if (envInfo.NEXT_PUBLIC_APP_VERSION) {
    lines.push(`Версия: ${envInfo.NEXT_PUBLIC_APP_VERSION}`);
  }
  if (summary) {
    lines.push(`Итоги: ${summary}`);
  }
  return lines.join("\n");
}
