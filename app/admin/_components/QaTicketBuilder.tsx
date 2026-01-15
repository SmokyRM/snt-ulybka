"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTicket,
  buildEnvSnapshot,
  type CheckResult,
  type DeadendResult,
  type MatrixResult,
  type EnvInfo,
  type SessionSnapshot,
  type TicketData,
} from "@/lib/qa/report";

type ComponentKey = "auth" | "cabinet" | "office" | "admin" | "public" | "qa";

type TicketPriority = "Низкий" | "Средний" | "Высокий" | "Блокер";

type QaTicketBuilderProps = {
  envInfo: EnvInfo;
  sessionSnapshot: SessionSnapshot;
};

type TagsState = {
  RBAC: boolean;
  "500": boolean;
  "404": boolean;
  Редирект: boolean;
  Тупик: boolean;
  UI: boolean;
  Данные: boolean;
};

const DEFAULT_TAGS: TagsState = {
  RBAC: false,
  "500": false,
  "404": false,
  Редирект: false,
  Тупик: false,
  UI: true,
  Данные: false,
};

function getInitialTags(): TagsState {
  return { ...DEFAULT_TAGS };
}

export default function QaTicketBuilder({ envInfo, sessionSnapshot }: QaTicketBuilderProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [component, setComponent] = useState<ComponentKey>("qa");
  const [priority, setPriority] = useState<TicketPriority>("Средний");
  const [tags, setTags] = useState<TagsState>(getInitialTags());

  const [checksResults, setChecksResults] = useState<CheckResult[] | null>(null);
  const [matrixResults, setMatrixResults] = useState<MatrixResult | null>(null);
  const [deadendResults, setDeadendResults] = useState<DeadendResult[] | null>(null);

  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);

  // Загружаем результаты проверок и матрицы
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const checksStr = window.localStorage.getItem("qa-checks-results");
      if (checksStr) {
        setChecksResults(JSON.parse(checksStr) as CheckResult[]);
      }
      const matrixStr = window.localStorage.getItem("qa-matrix-results");
      if (matrixStr) {
        setMatrixResults(JSON.parse(matrixStr) as MatrixResult);
      }
      const deadendsStr = window.localStorage.getItem("qa-deadends-results");
      if (deadendsStr) {
        setDeadendResults(JSON.parse(deadendsStr) as DeadendResult[]);
      }
    } catch {
      // Игнорируем ошибки чтения
    }

    // Пытаемся подтянуть заголовок из баг-репорта (если сохранён)
    try {
      const bugTitle = window.localStorage.getItem("qa-bug-title");
      if (bugTitle && !title) {
        setTitle(bugTitle);
      }
    } catch {
      // ignore
    }
  }, []);

  type AutoContext =
    | {
        kind: "500";
        route: string;
      }
    | {
        kind: "RBAC";
        role: string;
        route: string;
        expected: string;
        actual: string;
      }
    | {
        kind: "404";
        route: string;
      }
    | {
        kind: "REDIRECT";
        route: string;
        finalPath: string;
      }
    | {
        kind: "NONE";
      };

  const autoContext: AutoContext = useMemo(() => {
    // 500 из checks
    const criticalCheck = checksResults?.find((c) => (c.status ?? 0) >= 500);
    if (criticalCheck) {
      return { kind: "500", route: criticalCheck.url };
    }

    // 500 из матрицы
    if (matrixResults) {
      for (const [role, routes] of Object.entries(matrixResults)) {
        void role;
        for (const [route, cell] of Object.entries(routes)) {
          if ((cell.httpStatus ?? 0) >= 500) {
            return { kind: "500", route };
          }
        }
      }
    }

    // Несовпадения ожиданий RBAC
    if (matrixResults) {
      for (const [role, routes] of Object.entries(matrixResults)) {
        for (const [route, cell] of Object.entries(routes)) {
          if (cell.matchesExpected === false && cell.expected && cell.actual) {
            return {
              kind: "RBAC",
              role,
              route,
              expected: cell.expected,
              actual: cell.actual,
            };
          }
        }
      }
    }

    // 404
    const notFoundCheck = checksResults?.find((c) => c.status === 404);
    if (notFoundCheck) {
      return { kind: "404", route: notFoundCheck.url };
    }
    if (matrixResults) {
      for (const [, routes] of Object.entries(matrixResults)) {
        for (const [route, cell] of Object.entries(routes)) {
          if (cell.httpStatus === 404) {
            return { kind: "404", route };
          }
        }
      }
    }

    // Неожиданный редирект
    if (matrixResults) {
      for (const [, routes] of Object.entries(matrixResults)) {
        for (const [route, cell] of Object.entries(routes)) {
          const isUnexpectedRedirect =
            cell.status === "UNEXPECTED" &&
            cell.isRedirect &&
            cell.finalUrl &&
            cell.finalUrl.split("?")[0] !== route;
          if (isUnexpectedRedirect) {
            const finalPath = cell.finalUrl.split("?")[0];
            return { kind: "REDIRECT", route, finalPath };
          }
        }
      }
    }

    return { kind: "NONE" };
  }, [checksResults, matrixResults]);

  // Авто-заголовок и авто-теги
  useEffect(() => {
    const nextTags = getInitialTags();
    let autoTitle = title;

    if (autoContext.kind === "500") {
      autoTitle = `Блокер: 500 на ${autoContext.route}`;
      nextTags["500"] = true;
    } else if (autoContext.kind === "RBAC") {
      autoTitle = `RBAC: ${autoContext.role} доступ к ${autoContext.route} (ожидалось ${autoContext.expected}, получено ${autoContext.actual})`;
      nextTags.RBAC = true;
    } else if (autoContext.kind === "404") {
      autoTitle = `Тупик: 404 на ${autoContext.route}`;
      nextTags["404"] = true;
      nextTags["Тупик"] = true;
    } else if (autoContext.kind === "REDIRECT") {
      autoTitle = `Редирект: неожиданное перенаправление с ${autoContext.route} на ${autoContext.finalPath}`;
      nextTags["Редирект"] = true;
    }

    // dead-end issues -> тег "Тупик"
    if (deadendResults && deadendResults.length > 0) {
      nextTags["Тупик"] = true;
    }

    // Если не выставлены тегы автоматически и пользователь ещё не менял вручную — по умолчанию UI
    const hasAnyAutoTag =
      nextTags.RBAC || nextTags["500"] || nextTags["404"] || nextTags["Редирект"] || nextTags["Тупик"];
    if (!hasAnyAutoTag) {
      nextTags.UI = true;
    }

    // Если заголовок пустой, устанавливаем авто-значение
    if (!title && autoTitle) {
      setTitle(autoTitle);
    }

    setTags((prev) => {
      // Если пользователь уже явно изменял теги, не перекрываем полностью,
      // но добавляем автоматически определённые.
      const updated: TagsState = { ...prev };
      (Object.keys(nextTags) as Array<keyof TagsState>).forEach((key) => {
        if (nextTags[key]) {
          updated[key] = true;
        }
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoContext, deadendResults]);

  // Авто-описание по умолчанию
  useEffect(() => {
    if (body) return;
    const parts: string[] = [];

    parts.push("Кратко: опишите проблему в одном-двух предложениях.");
    parts.push("");
    parts.push("Шаги воспроизведения:");
    parts.push("1. …");
    parts.push("2. …");
    parts.push("3. …");
    parts.push("");
    parts.push("Ожидаемый результат:");
    parts.push("…");
    parts.push("");
    parts.push("Фактический результат:");
    parts.push("…");

    setBody(parts.join("\n"));
  }, [body]);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "—";

  const tagsList = useMemo(
    () =>
      (Object.keys(tags) as Array<keyof TagsState>)
        .filter((key) => tags[key])
        .join(", ") || "—",
    [tags]
  );

  const componentLabel = useMemo(() => {
    switch (component) {
      case "auth":
        return "Авторизация";
      case "cabinet":
        return "Кабинет жителя";
      case "office":
        return "Office";
      case "admin":
        return "Админка";
      case "public":
        return "Публичные страницы";
      case "qa":
      default:
        return "QA";
    }
  }, [component]);

  const buildMarkdown = (): string => {
    const snapshot = buildEnvSnapshot(envInfo, sessionSnapshot, currentUrl);
    const ticketData: TicketData = {
      title: title || "Задача QA",
      body,
      component: componentLabel,
      priority,
      tags: (Object.keys(tags) as Array<keyof TagsState>).filter((key) => tags[key]),
    };

    return buildTicket({
      snapshot,
      ticket: ticketData,
      checks: checksResults,
      matrix: matrixResults,
      deadends: deadendResults,
    });
  };

  const buildTelegramText = (): string => {
    const lines: string[] = [];
    lines.push(`Задача: ${title || "Проблема в приложении"}`);
    lines.push(`Компонент: ${componentLabel}`);
    lines.push(`Приоритет: ${priority}`);
    lines.push(`Теги: ${tagsList}`);
    lines.push(`URL: ${currentUrl}`);

    if (autoContext.kind === "500") {
      lines.push(`Ситуация: 500 ошибка на маршруте ${autoContext.route}`);
    } else if (autoContext.kind === "RBAC") {
      lines.push(
        `Ситуация: несоответствие RBAC — роль ${autoContext.role}, маршрут ${autoContext.route}, ожидалось "${autoContext.expected}", фактически "${autoContext.actual}".`
      );
    } else if (autoContext.kind === "404") {
      lines.push(`Ситуация: 404 (тупик) на маршруте ${autoContext.route}`);
    } else if (autoContext.kind === "REDIRECT") {
      lines.push(
        `Ситуация: неожиданный редирект с ${autoContext.route} на ${autoContext.finalPath}.`
      );
    }

    if (body) {
      const firstLine = body.split("\n").find((l) => l.trim().length > 0);
      if (firstLine) {
        lines.push("");
        lines.push(`Кратко из описания: ${firstLine}`);
      }
    }

    return lines.join("\n");
  };

  const handleCopyMd = async () => {
    const text = buildMarkdown();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedMd(true);
        setTimeout(() => setCopiedMd(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyTg = async () => {
    const text = buildTelegramText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTg(true);
      setTimeout(() => setCopiedTg(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedTg(true);
        setTimeout(() => setCopiedTg(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const toggleTag = (key: keyof TagsState) => {
    setTags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="qa-ticket-builder"
    >
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Задача для трекера</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Сформируйте задачу для трекера на основе результатов проверок и матрицы доступов.
      </p>

      <div className="space-y-4">
        {/* Заголовок */}
        <div>
          <label htmlFor="qa-ticket-title" className="mb-1 block text-sm font-medium text-zinc-700">
            Заголовок
          </label>
          <input
            id="qa-ticket-title"
            data-testid="qa-ticket-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder="Краткий заголовок задачи"
          />
        </div>

        {/* Описание */}
        <div>
          <label htmlFor="qa-ticket-body" className="mb-1 block text-sm font-medium text-zinc-700">
            Описание
          </label>
          <textarea
            id="qa-ticket-body"
            data-testid="qa-ticket-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            placeholder="Подробное описание сценария, ожиданий и фактического результата"
          />
        </div>

        {/* Компонент */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="qa-ticket-component"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Компонент
            </label>
            <select
              id="qa-ticket-component"
              value={component}
              onChange={(e) => setComponent(e.target.value as ComponentKey)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            >
              <option value="auth">Авторизация</option>
              <option value="cabinet">Кабинет жителя</option>
              <option value="office">Office</option>
              <option value="admin">Админка</option>
              <option value="public">Публичные страницы</option>
              <option value="qa">QA</option>
            </select>
          </div>

          {/* Приоритет */}
          <div>
            <label
              htmlFor="qa-ticket-priority"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Приоритет
            </label>
            <select
              id="qa-ticket-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#5E704F] focus:outline-none focus:ring-1 focus:ring-[#5E704F]"
            >
              <option value="Низкий">Низкий</option>
              <option value="Средний">Средний</option>
              <option value="Высокий">Высокий</option>
              <option value="Блокер">Блокер</option>
            </select>
          </div>
        </div>

        {/* Теги */}
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Теги</span>
          <div className="flex flex-wrap gap-2 text-sm" data-testid="qa-ticket-tags">
            {(Object.keys(tags) as Array<keyof TagsState>).map((key) => (
              <label
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 cursor-pointer hover:border-[#5E704F] hover:bg-[#5E704F]/5"
              >
                <input
                  type="checkbox"
                  checked={tags[key]}
                  onChange={() => toggleTag(key)}
                  className="h-3 w-3 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Кнопки копирования */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopyMd}
            data-testid="qa-ticket-copy-md"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={
              copiedMd
                ? "Задача в формате Markdown скопирована"
                : "Скопировать задачу в формате Markdown"
            }
            aria-live="polite"
          >
            {copiedMd ? "Скопировано" : "Скопировать задачу (Markdown)"}
          </button>
          <button
            type="button"
            onClick={handleCopyTg}
            data-testid="qa-ticket-copy-tg"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
            aria-label={
              copiedTg
                ? "Задача для Telegram скопирована"
                : "Скопировать описание задачи для Telegram"
            }
            aria-live="polite"
          >
            {copiedTg ? "Скопировано" : "Скопировать для Telegram"}
          </button>
        </div>
      </div>
    </section>
  );
}

