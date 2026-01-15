/**
 * Единый модуль генерации QA отчётов
 * Все тексты на русском языке, стабильный Markdown формат
 */

const SENSITIVE_KEYS = ["password", "token", "cookie", "authorization", "secret", "session"];

type SanitizeResult<T> = {
  value: T;
  sanitized: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeValue<T>(value: T): SanitizeResult<T> {
  if (Array.isArray(value)) {
    let sanitized = false;
    const result = value.map((item) => {
      if (isPlainObject(item) || Array.isArray(item)) {
        const nested = sanitizeValue(item);
        if (nested.sanitized) sanitized = true;
        return nested.value;
      }
      return item;
    }) as T;
    return { value: result, sanitized };
  }

  if (isPlainObject(value)) {
    return sanitizeObjectDeep(value as Record<string, unknown>) as SanitizeResult<T>;
  }

  return { value, sanitized: false };
}

function sanitizeObjectDeep<T extends Record<string, unknown>>(input: T): SanitizeResult<T> {
  let sanitized = false;
  const result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized = true;
      continue;
    }

    const nested = sanitizeValue(rawValue);
    if (nested.sanitized) {
      sanitized = true;
    }
    result[key] = nested.value;
  }

  return { value: result as T, sanitized };
}

export type EnvInfo = {
  NODE_ENV: string | undefined;
  ENABLE_QA: string | undefined;
  NEXT_PUBLIC_APP_VERSION?: string;
  GIT_SHA?: string;
};

export type SessionSnapshot = {
  role?: string;
  userId?: string;
  username?: string;
  fullName?: string;
  isQaOverride?: boolean;
};

export type EnvSnapshot = {
  timestamp: Date;
  env: EnvInfo;
  session: SessionSnapshot;
  currentUrl: string;
  userAgent?: string;
  timezone?: string;
  featureFlags?: Record<string, boolean>;
  hasSensitiveDataHidden?: boolean;
  requestIds?: string[];
};

export type CheckResult = {
  name: string;
  url: string;
  status: number | null;
  statusText: string;
  timeMs: number;
  error?: string;
  redirectTo?: string;
  finalVerdict?: string;
  requestId?: string;
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

export type BugReportForm = {
  title: string;
  steps: string;
  expected: string;
  actual: string;
  priority: string;
};

export type TestRunData = {
  scenarios: Array<{
    id: string;
    title: string;
    steps: Array<{ id: string; text: string; checked: boolean }>;
    note: string;
  }>;
  comment?: string;
};

export type TicketData = {
  title: string;
  body: string;
  component: string;
  priority: string;
  tags: string[];
};

/**
 * Форматирует дату/время в русском формате
 */
function formatDateTime(date: Date = new Date()): string {
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
 * Собирает снимок среды (безопасно, без секретов)
 */
export function buildEnvSnapshot(
  envInfo: EnvInfo,
  sessionSnapshot: SessionSnapshot,
  currentUrl: string,
  userAgent?: string,
  timezone?: string,
  featureFlags?: Record<string, boolean>,
  requestIds?: string[]
): EnvSnapshot {
  const { value: safeEnv, sanitized: envSanitized } = sanitizeObjectDeep(envInfo as Record<string, unknown>);
  const { value: safeSession, sanitized: sessionSanitized } = sanitizeObjectDeep(
    sessionSnapshot as Record<string, unknown>
  );

  let safeFeatureFlags: Record<string, boolean> | undefined = featureFlags;
  let flagsSanitized = false;
  if (featureFlags) {
    const sanitizedFlags = sanitizeObjectDeep(featureFlags as Record<string, unknown>);
    safeFeatureFlags = sanitizedFlags.value as Record<string, boolean>;
    flagsSanitized = sanitizedFlags.sanitized;
  }

  return {
    timestamp: new Date(),
    env: safeEnv as EnvInfo,
    session: safeSession as SessionSnapshot,
    currentUrl,
    userAgent,
    timezone,
    featureFlags: safeFeatureFlags,
    hasSensitiveDataHidden: envSanitized || sessionSanitized || flagsSanitized,
    requestIds: requestIds && requestIds.length > 0 ? requestIds : undefined,
  };
}

/**
 * Форматирует снимок среды в Markdown
 */
export function formatEnvSnapshot(snapshot: EnvSnapshot): string {
  const lines: string[] = [];
  lines.push("## Снимок среды");
  lines.push("");
  lines.push(`**Дата/время:** ${formatDateTime(snapshot.timestamp)}`);
  lines.push(`**URL:** ${snapshot.currentUrl}`);
  lines.push("");

  lines.push("### Окружение");
  lines.push("");
  lines.push(`- **NODE_ENV:** ${snapshot.env.NODE_ENV || "—"}`);
  lines.push(`- **ENABLE_QA:** ${snapshot.env.ENABLE_QA || "—"}`);
  if (snapshot.env.NEXT_PUBLIC_APP_VERSION) {
    lines.push(`- **APP_VERSION:** ${snapshot.env.NEXT_PUBLIC_APP_VERSION}`);
  }
  if (snapshot.env.GIT_SHA) {
    lines.push(`- **GIT_SHA:** ${snapshot.env.GIT_SHA}`);
  }
  lines.push("");

  lines.push("### Сессия");
  lines.push("");
  lines.push(`- **Роль:** ${snapshot.session.role || "—"}`);
  if (snapshot.session.userId) {
    lines.push(`- **ID пользователя:** ${snapshot.session.userId}`);
  }
  if (snapshot.session.username || snapshot.session.fullName) {
    lines.push(`- **Имя пользователя:** ${snapshot.session.username || snapshot.session.fullName || "—"}`);
  }
  lines.push(`- **QA Override:** ${snapshot.session.isQaOverride ? "да" : "нет"}`);
  lines.push("");

  if (snapshot.userAgent) {
    lines.push("### Браузер");
    lines.push("");
    lines.push(`- **User-Agent:** ${snapshot.userAgent}`);
    if (snapshot.timezone) {
      lines.push(`- **Часовой пояс:** ${snapshot.timezone}`);
    }
    lines.push("");
  }

  if (snapshot.featureFlags && Object.keys(snapshot.featureFlags).length > 0) {
    lines.push("### Feature Flags");
    lines.push("");
    Object.entries(snapshot.featureFlags)
      .filter(([, value]) => value === true || value === false)
      .forEach(([key, value]) => {
        lines.push(`- **${key}:** ${value ? "включён" : "выключен"}`);
      });
    lines.push("");
  }

  if (snapshot.hasSensitiveDataHidden) {
    lines.push("Скрыты чувствительные данные.");
    lines.push("");
  }

  if (snapshot.requestIds && snapshot.requestIds.length > 0) {
    lines.push("### Request IDs");
    lines.push("");
    lines.push(`Собрано ${snapshot.requestIds.length} request-id из ответов сервера:`);
    snapshot.requestIds.forEach((id) => {
      lines.push(`- \`${id}\``);
    });
    lines.push("");
  }

  return lines.join("\n");
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
    const verdict = check.finalVerdict ? ` (${check.finalVerdict})` : "";
    const requestId = check.requestId ? ` [request-id: \`${check.requestId}\`]` : "";
    lines.push(`- **${check.name}** (\`${check.url}\`): ${status} (${check.timeMs} мс)${error}${verdict}${requestId}`);
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
 * Генерирует диагностический отчёт
 */
export function buildDiagnosticsReport(params: {
  snapshot: EnvSnapshot;
  checks?: CheckResult[] | null;
  matrix?: MatrixResult | null;
  deadends?: DeadendResult[] | null;
  log?: string;
}): string {
  const lines: string[] = [];
  lines.push("# Диагностический отчёт QA");
  lines.push("");
  lines.push(formatEnvSnapshot(params.snapshot));
  lines.push("");
  lines.push(formatChecksResults(params.checks));
  lines.push("");
  lines.push(formatMatrixResults(params.matrix));
  lines.push("");
  lines.push(formatDeadendsResults(params.deadends));
  lines.push("");

  if (params.log) {
    lines.push("## Лог действий");
    lines.push("");
    lines.push("```");
    lines.push(params.log);
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Создано QA кабинетом — диагностический отчёт*");

  return lines.join("\n");
}

/**
 * Генерирует баг-репорт
 */
export function buildBugReport(params: {
  snapshot: EnvSnapshot;
  form: BugReportForm;
  checks?: CheckResult[] | null;
  matrix?: MatrixResult | null;
  deadends?: DeadendResult[] | null;
  log?: string;
}): string {
  const lines: string[] = [];
  lines.push("# Баг-репорт");
  lines.push("");
  lines.push(formatEnvSnapshot(params.snapshot));
  lines.push("");

  lines.push("## Описание проблемы");
  lines.push("");
  lines.push(`**Кратко:** ${params.form.title || "—"}`);
  lines.push(`**Приоритет:** ${params.form.priority}`);
  lines.push("");

  lines.push("### Шаги воспроизведения");
  lines.push("");
  lines.push(params.form.steps || "—");
  lines.push("");

  lines.push("### Ожидаемый результат");
  lines.push("");
  lines.push(params.form.expected || "—");
  lines.push("");

  lines.push("### Фактический результат");
  lines.push("");
  lines.push(params.form.actual || "—");
  lines.push("");

  lines.push(formatChecksResults(params.checks));
  lines.push("");
  lines.push(formatMatrixResults(params.matrix));
  lines.push("");
  lines.push(formatDeadendsResults(params.deadends));
  lines.push("");

  if (params.log) {
    lines.push("## Лог действий");
    lines.push("");
    lines.push("```");
    lines.push(params.log);
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Создано QA кабинетом — баг-репорт*");

  return lines.join("\n");
}

/**
 * Генерирует отчёт прогона тестов
 */
export function buildTestRunReport(params: {
  snapshot: EnvSnapshot;
  testRun: TestRunData;
  checks?: CheckResult[] | null;
  matrix?: MatrixResult | null;
  deadends?: DeadendResult[] | null;
  log?: string;
}): string {
  const lines: string[] = [];
  lines.push("# Отчёт прогона тестов");
  lines.push("");
  lines.push(formatEnvSnapshot(params.snapshot));
  lines.push("");

  // Подсчитываем статистику
  let totalSteps = 0;
  let completedSteps = 0;
  const failedScenarios: Array<{
    title: string;
    failedSteps: Array<{ text: string }>;
    note: string;
  }> = [];

  params.testRun.scenarios.forEach((scenario) => {
    const scenarioTotal = scenario.steps.length;
    const scenarioCompleted = scenario.steps.filter((s) => s.checked).length;
    totalSteps += scenarioTotal;
    completedSteps += scenarioCompleted;

    const failedSteps = scenario.steps.filter((s) => !s.checked);
    if (failedSteps.length > 0 || scenario.note) {
      failedScenarios.push({
        title: scenario.title,
        failedSteps: failedSteps.map((s) => ({ text: s.text })),
        note: scenario.note,
      });
    }
  });

  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  lines.push("## Итоги по сценариям");
  lines.push("");
  lines.push(`- **Всего шагов:** ${totalSteps}`);
  lines.push(`- **Выполнено:** ${completedSteps}`);
  lines.push(`- **Провалено:** ${totalSteps - completedSteps}`);
  lines.push(`- **Процент выполнения:** ${percent}%`);
  lines.push("");

  if (params.testRun.comment) {
    lines.push("## Комментарий по прогону");
    lines.push("");
    lines.push(params.testRun.comment);
    lines.push("");
  }

  lines.push("## Проваленные шаги");
  lines.push("");

  if (failedScenarios.length > 0) {
    failedScenarios.forEach((scenario) => {
      lines.push(`### ${scenario.title}`);
      lines.push("");
      if (scenario.failedSteps.length > 0) {
        scenario.failedSteps.forEach((step) => {
          lines.push(`- ❌ ${step.text}`);
        });
      }
      if (scenario.note) {
        lines.push("");
        lines.push(`**Примечание:** ${scenario.note}`);
      }
      lines.push("");
    });
  } else {
    lines.push("Все шаги выполнены успешно.");
    lines.push("");
  }

  lines.push(formatChecksResults(params.checks));
  lines.push("");
  lines.push(formatMatrixResults(params.matrix));
  lines.push("");
  lines.push(formatDeadendsResults(params.deadends));
  lines.push("");

  if (params.log) {
    lines.push("## Лог действий");
    lines.push("");
    lines.push("```");
    lines.push(params.log);
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Создано QA кабинетом — отчёт прогона тестов*");

  return lines.join("\n");
}

/**
 * Генерирует задачу для трекера
 */
export function buildTicket(params: {
  snapshot: EnvSnapshot;
  ticket: TicketData;
  checks?: CheckResult[] | null;
  matrix?: MatrixResult | null;
  deadends?: DeadendResult[] | null;
  log?: string;
}): string {
  const lines: string[] = [];
  lines.push("# Задача для трекера");
  lines.push("");
  lines.push("## Заголовок");
  lines.push("");
  lines.push(params.ticket.title || "Задача QA");
  lines.push("");

  lines.push(formatEnvSnapshot(params.snapshot));
  lines.push("");

  lines.push("## Контекст");
  lines.push("");
  lines.push(`**Компонент:** ${params.ticket.component}`);
  lines.push(`**Приоритет:** ${params.ticket.priority}`);
  lines.push(`**Теги:** ${params.ticket.tags.join(", ") || "—"}`);
  lines.push("");

  lines.push("## Описание задачи");
  lines.push("");
  lines.push(params.ticket.body || "—");
  lines.push("");

  lines.push("## Результаты автоматических проверок");
  lines.push("");
  lines.push(formatChecksResults(params.checks));
  lines.push("");
  lines.push(formatMatrixResults(params.matrix));
  lines.push("");
  lines.push(formatDeadendsResults(params.deadends));
  lines.push("");

  lines.push("## Лог действий (последние 20 строк)");
  lines.push("");
  if (params.log) {
    lines.push("```");
    lines.push(params.log);
    lines.push("```");
  } else {
    lines.push("— лог действий нужно добавить вручную (консоль браузера, server logs или артефакты CI)");
  }
  lines.push("");

  lines.push("## Вложения");
  lines.push("");
  lines.push("- скрин/видео/trace — см. артефакты CI (если есть)");

  return lines.join("\n");
}

/**
 * Генерирует краткую версию отчёта для чата
 */
export function buildShortReport(
  title: string,
  snapshot: EnvSnapshot,
  summary?: string
): string {
  const lines: string[] = [];
  lines.push(`**${title}**`);
  lines.push(`Дата: ${formatDateTime(snapshot.timestamp)}`);
  lines.push(`URL: ${snapshot.currentUrl}`);
  lines.push(`Роль: ${snapshot.session.role || "—"}`);
  lines.push(`Env: ${snapshot.env.NODE_ENV || "—"}`);
  if (snapshot.env.NEXT_PUBLIC_APP_VERSION) {
    lines.push(`Версия: ${snapshot.env.NEXT_PUBLIC_APP_VERSION}`);
  }
  if (summary) {
    lines.push(`Итоги: ${summary}`);
  }
  return lines.join("\n");
}
