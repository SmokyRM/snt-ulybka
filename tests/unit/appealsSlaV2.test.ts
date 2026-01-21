import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Мокаем server-only для тестов перед импортом
vi.mock("server-only", () => ({}));

import { createAppeal, updateAppealType } from "@/lib/appeals.store";
import { calculateDueAtByType } from "@/config/slaRules";
import type { AppealCategory } from "@/lib/office/types";

describe("Sprint 3.1: SLA v2 - управляемый dueAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("при создании обращения без dueAt устанавливает dueAtSource='auto'", async () => {
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 1",
    });

    expect(appeal.dueAt).toBeDefined();
    expect(appeal.dueAtSource).toBe("auto");
  });

  it("при создании обращения с ручным dueAt устанавливает dueAtSource='manual'", async () => {
    const manualDueAt = new Date("2025-01-05T12:00:00.000Z").toISOString();
    
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 1",
      dueAt: manualDueAt,
    });

    expect(appeal.dueAt).toBe(manualDueAt);
    expect(appeal.dueAtSource).toBe("manual");
  });

  it("при смене type пересчитывает dueAt только если dueAtSource='auto'", async () => {
    // Создаем обращение с auto dueAt
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 1",
    });

    expect(appeal.dueAtSource).toBe("auto");
    const originalDueAt = appeal.dueAt;
    const originalType = appeal.type;

    // Меняем тип на другой
    const newType: AppealCategory = originalType === "finance" ? "access" : "finance";
    const updated = await updateAppealType(appeal.id, newType);

    expect(updated).not.toBeNull();
    expect(updated!.type).toBe(newType);
    // dueAt должен быть пересчитан (так как dueAtSource='auto')
    expect(updated!.dueAt).not.toBe(originalDueAt);
    expect(updated!.dueAtSource).toBe("auto");
    
    // Проверяем что новый dueAt соответствует новому типу
    const expectedDueAt = calculateDueAtByType(newType);
    expect(updated!.dueAt).toBe(expectedDueAt);
  });

  it("при смене type НЕ пересчитывает dueAt если dueAtSource='manual'", async () => {
    // Создаем обращение с manual dueAt
    const manualDueAt = new Date("2025-01-05T12:00:00.000Z").toISOString();
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 1",
      dueAt: manualDueAt,
    });

    expect(appeal.dueAtSource).toBe("manual");
    const originalDueAt = appeal.dueAt;
    const originalType = appeal.type;

    // Меняем тип на другой
    const newType: AppealCategory = originalType === "finance" ? "access" : "finance";
    const updated = await updateAppealType(appeal.id, newType);

    expect(updated).not.toBeNull();
    expect(updated!.type).toBe(newType);
    // dueAt НЕ должен быть пересчитан (так как dueAtSource='manual')
    expect(updated!.dueAt).toBe(originalDueAt);
    expect(updated!.dueAtSource).toBe("manual");
  });

  it("при создании обращения разных типов устанавливает правильный dueAt по SLA правилам", async () => {
    // Создаем обращение и проверяем, что dueAt установлен
    const appeal = await createAppeal({
      title: "Вопрос по оплате",
      body: "Прошу уточнить начисления",
      authorName: "Иван Иванов",
      plotNumber: "Тест, 2",
    });

    expect(appeal.dueAt).toBeDefined();
    expect(appeal.dueAtSource).toBe("auto");
    expect(appeal.type).toBeDefined();

    // Проверяем что dueAt установлен в будущем
    const dueDate = new Date(appeal.dueAt!);
    const now = new Date();
    expect(dueDate.getTime()).toBeGreaterThan(now.getTime());

    // Проверяем что при смене типа на access (12 часов) dueAt пересчитывается
    const updatedAccess = await updateAppealType(appeal.id, "access");
    expect(updatedAccess).not.toBeNull();
    expect(updatedAccess!.type).toBe("access");
    expect(updatedAccess!.dueAtSource).toBe("auto");
    const accessDueDate = new Date(updatedAccess!.dueAt!);
    const accessHoursDiff = (accessDueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(accessHoursDiff).toBeGreaterThan(11);
    expect(accessHoursDiff).toBeLessThan(13);

    // Проверяем что при смене типа на finance (48 часов) dueAt пересчитывается
    const updatedFinance = await updateAppealType(updatedAccess!.id, "finance");
    expect(updatedFinance).not.toBeNull();
    expect(updatedFinance!.type).toBe("finance");
    expect(updatedFinance!.dueAtSource).toBe("auto");
    const financeDueDate = new Date(updatedFinance!.dueAt!);
    const financeHoursDiff = (financeDueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(financeHoursDiff).toBeGreaterThan(47);
    expect(financeHoursDiff).toBeLessThan(49);

    // Проверяем что при смене типа на documents (72 часа) dueAt пересчитывается
    const updatedDocuments = await updateAppealType(updatedFinance!.id, "documents");
    expect(updatedDocuments).not.toBeNull();
    expect(updatedDocuments!.type).toBe("documents");
    expect(updatedDocuments!.dueAtSource).toBe("auto");
    const documentsDueDate = new Date(updatedDocuments!.dueAt!);
    const documentsHoursDiff = (documentsDueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(documentsHoursDiff).toBeGreaterThan(71);
    expect(documentsHoursDiff).toBeLessThan(73);
  });

  it("при создании обращения с неизвестным типом использует дефолт 72 часа", async () => {
    const appeal = await createAppeal({
      title: "Необычный вопрос",
      body: "Какой-то текст без ключевых слов для тестирования",
      authorName: "Тест Тестов",
      plotNumber: "Тест, 5",
    });

    expect(appeal.dueAt).toBeDefined();
    expect(appeal.dueAtSource).toBe("auto");
    
    // Проверяем что dueAt установлен примерно на 72 часа вперед
    const dueDate = new Date(appeal.dueAt!);
    const now = new Date();
    const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Должно быть примерно 72 часа (с небольшой погрешностью)
    expect(hoursDiff).toBeGreaterThan(70);
    expect(hoursDiff).toBeLessThan(74);
  });
});
