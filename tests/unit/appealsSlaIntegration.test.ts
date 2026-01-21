import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Мокаем server-only для тестов перед импортом
vi.mock("server-only", () => ({}));

import { createAppeal } from "@/lib/appeals.store";
import { calculateDueAtByType, DEFAULT_SLA_HOURS } from "@/lib/appealsSla";
import type { AppealCategory } from "@/lib/office/types";

describe("appealsSla integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createAppeal sets dueAt based on type", () => {
    it("создает обращение типа finance с dueAt = 48 часов", async () => {
      const appeal = await createAppeal({
        title: "Вопрос по взносам",
        body: "Прошу уточнить начисления за последний период. Нужна квитанция для оплаты.",
        authorId: "user1",
        authorName: "Тест",
        plotNumber: "1",
      });

      expect(appeal.type).toBe("finance");
      expect(appeal.dueAt).toBeDefined();
      
      const dueAtDate = new Date(appeal.dueAt!);
      const expected = new Date("2025-01-03T12:00:00.000Z"); // +48 часов
      expect(dueAtDate.getTime()).toBe(expected.getTime());
    });

    it("создает обращение типа electricity с dueAt = 24 часа", async () => {
      const appeal = await createAppeal({
        title: "Показания счетчика",
        body: "Передаю показания счетчика электроэнергии за январь: 12345 кВт.",
        authorId: "user2",
        authorName: "Тест",
        plotNumber: "2",
      });

      expect(appeal.type).toBe("electricity");
      expect(appeal.dueAt).toBeDefined();
      
      const dueAtDate = new Date(appeal.dueAt!);
      const expected = new Date("2025-01-02T12:00:00.000Z"); // +24 часа
      expect(dueAtDate.getTime()).toBe(expected.getTime());
    });

    it("создает обращение типа access с dueAt = 6 часов (высокий приоритет + triage override)", async () => {
      const appeal = await createAppeal({
        title: "Проблема с доступом",
        body: "Не могу войти в кабинет, забыл код доступа. Нужна помощь.",
        authorId: "user3",
        authorName: "Тест",
        plotNumber: "3",
      });

      expect(appeal.type).toBe("access");
      expect(appeal.dueAt).toBeDefined();

      const dueAtDate = new Date(appeal.dueAt!);
      const expected = new Date("2025-01-01T18:00:00.000Z"); // +6 часов (triage rule override для high priority access)
      expect(dueAtDate.getTime()).toBe(expected.getTime());
    });

    it("создает обращение типа documents с dueAt = 72 часа", async () => {
      const appeal = await createAppeal({
        title: "Запрос документов",
        body: "Нужна копия протокола общего собрания за прошлый год.",
        authorId: "user4",
        authorName: "Тест",
        plotNumber: "4",
      });

      expect(appeal.type).toBe("documents");
      expect(appeal.dueAt).toBeDefined();
      
      const dueAtDate = new Date(appeal.dueAt!);
      const expected = new Date("2025-01-04T12:00:00.000Z"); // +72 часа
      expect(dueAtDate.getTime()).toBe(expected.getTime());
    });

    it("создает обращение типа general с dueAt = 72 часа (дефолт)", async () => {
      const appeal = await createAppeal({
        title: "Общий вопрос",
        body: "Хочу узнать общую информацию о работе правления.",
        authorId: "user5",
        authorName: "Тест",
        plotNumber: "5",
      });

      expect(appeal.type).toBe("general");
      expect(appeal.dueAt).toBeDefined();
      
      const dueAtDate = new Date(appeal.dueAt!);
      const expected = new Date("2025-01-04T12:00:00.000Z"); // +72 часа
      expect(dueAtDate.getTime()).toBe(expected.getTime());
    });

    it("всегда устанавливает поле type при создании", async () => {
      const appeal = await createAppeal({
        title: "Тестовое обращение",
        body: "Любой текст для тестирования создания обращения.",
        authorId: "user6",
        authorName: "Тест",
        plotNumber: "6",
      });

      expect(appeal.type).toBeDefined();
      expect(typeof appeal.type).toBe("string");
      expect([
        "finance",
        "electricity",
        "documents",
        "access",
        "membership",
        "insufficient_data",
        "general",
      ]).toContain(appeal.type);
    });

    it("всегда устанавливает поле dueAt при создании", async () => {
      const appeal = await createAppeal({
        title: "Тестовое обращение",
        body: "Любой текст для тестирования создания обращения.",
        authorId: "user7",
        authorName: "Тест",
        plotNumber: "7",
      });

      expect(appeal.dueAt).toBeDefined();
      expect(typeof appeal.dueAt).toBe("string");
      
      // Проверяем, что dueAt в будущем
      const dueAtDate = new Date(appeal.dueAt!);
      const now = new Date();
      expect(dueAtDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });
});
