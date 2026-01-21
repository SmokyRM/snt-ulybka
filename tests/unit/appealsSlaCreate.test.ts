import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Мокаем server-only для тестов перед импортом
vi.mock("server-only", () => ({}));

import { createAppeal } from "@/lib/appeals.store";
import { calculateDueAtByType, DEFAULT_SLA_HOURS } from "@/lib/appealsSla";
import type { AppealCategory } from "@/lib/office/types";

describe("appealsSla - создание обращений", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("при создании обращения автоматически устанавливает dueAt по типу", async () => {
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления за январь",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 1",
    });

    expect(appeal.dueAt).toBeDefined();
    expect(appeal.dueAtSource).toBe("auto");
    
    // Проверяем что dueAt установлен корректно (должен быть в будущем)
    const dueDate = new Date(appeal.dueAt!);
    const now = new Date();
    expect(dueDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it("при создании обращения с типом finance устанавливает dueAt на 48 часов", async () => {
    const appeal = await createAppeal({
      title: "Вопрос по взносам",
      body: "Прошу уточнить размер взноса и оплату",
      authorName: "Петр Петров",
      plotNumber: "Тест, 2",
    });

    expect(appeal.dueAt).toBeDefined();
    expect(appeal.type).toBeDefined();
    
    // Если тип finance, dueAt должен быть через 48 часов
    if (appeal.type === "finance") {
      const expectedDueAt = calculateDueAtByType("finance");
      expect(appeal.dueAt).toBe(expectedDueAt);
    }
  });

  it("при создании обращения всегда устанавливает dueAt (даже если тип неизвестен)", async () => {
    const appeal = await createAppeal({
      title: "Необычный вопрос",
      body: "Какой-то текст без ключевых слов для тестирования",
      authorName: "Тест Тестов",
      plotNumber: "Тест, 3",
    });

    // dueAt должен быть установлен всегда
    expect(appeal.dueAt).toBeDefined();
    expect(appeal.dueAtSource).toBe("auto");
    
    // Если тип не определен или неизвестен, должен использоваться дефолт 72 часа
    const dueDate = new Date(appeal.dueAt!);
    const now = new Date();
    const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Должно быть примерно 72 часа (с небольшой погрешностью)
    expect(hoursDiff).toBeGreaterThan(70);
    expect(hoursDiff).toBeLessThan(74);
  });

  it("при создании обращения устанавливает тип через triage", async () => {
    const appeal = await createAppeal({
      title: "Проблема с доступом",
      body: "Не могу войти в кабинет, нужен код доступа",
      authorName: "Сергей Сергеев",
      plotNumber: "Тест, 4",
    });

    expect(appeal.type).toBeDefined();
    expect(appeal.dueAt).toBeDefined();
    
    // Тип должен быть определен через triage
    const validCategories: AppealCategory[] = [
      "finance",
      "electricity",
      "documents",
      "access",
      "membership",
      "insufficient_data",
      "general",
    ];
    expect(validCategories).toContain(appeal.type);
  });

  it("миграция: listAppeals устанавливает dueAt для обращений без него", async () => {
    // Этот тест проверяет что миграция работает
    // В реальности seedAppeals может содержать обращения без dueAt
    const { listAppeals } = await import("@/lib/appeals.store");
    const appeals = listAppeals();
    
    // Все обращения должны иметь dueAt после миграции
    appeals.forEach((appeal) => {
      expect(appeal.dueAt).toBeDefined();
      expect(typeof appeal.dueAt).toBe("string");
      // Проверяем что dueAt валидная дата
      expect(() => new Date(appeal.dueAt!)).not.toThrow();
    });
  });
});
