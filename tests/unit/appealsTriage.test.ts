import { describe, it, expect } from "vitest";
import { categorizeAppeal, checkDataCompleteness, triageAppeal } from "@/lib/appealsTriage";
import type { Appeal } from "@/lib/office/types";

describe("appealsTriage", () => {
  describe("categorizeAppeal", () => {
    it("определяет категорию finance по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Вопрос по оплате",
        body: "Прошу проверить оплату и взносы за январь",
      });
      expect(result.category).toBe("finance");
      expect(result.assigneeRole).toBe("accountant");
      expect(result.priority).toBe("medium");
    });

    it("определяет категорию electricity по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Показания счетчика",
        body: "Передаю показания счетчика, киловатты за февраль",
      });
      expect(result.category).toBe("electricity");
      expect(result.assigneeRole).toBe("accountant");
    });

    it("определяет категорию documents по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Нужна копия протокола",
        body: "Прошу предоставить копию протокола собрания",
      });
      expect(result.category).toBe("documents");
      expect(result.assigneeRole).toBe("secretary");
    });

    it("определяет категорию access по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Проблема с доступом",
        body: "Не могу войти в кабинет, забыл код доступа",
      });
      expect(result.category).toBe("access");
      expect(result.assigneeRole).toBe("secretary");
      expect(result.priority).toBe("high");
    });

    it("определяет категорию membership по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Вопрос о членстве",
        body: "Хочу вступить в СНТ",
      });
      expect(result.category).toBe("membership");
      expect(result.assigneeRole).toBe("chairman");
    });

    it("определяет категорию insufficient_data по ключевым словам", () => {
      const result = categorizeAppeal({
        title: "Не знаю",
        body: "Не помню номер участка",
      });
      expect(result.category).toBe("insufficient_data");
      expect(result.needsInfo).toBe(true);
    });

    it("возвращает general для неизвестных обращений", () => {
      const result = categorizeAppeal({
        title: "Общий вопрос",
        body: "Хочу задать вопрос",
      });
      expect(result.category).toBe("general");
      expect(result.assigneeRole).toBe("secretary");
    });

    it("работает с разным регистром", () => {
      const result = categorizeAppeal({
        title: "НАЧИСЛЕНИЯ",
        body: "Вопрос по ОПЛАТЕ и платежам",
      });
      expect(result.category).toBe("finance");
    });
  });

  describe("checkDataCompleteness", () => {
    it("возвращает true для полных данных", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос по начислениям",
        body: "Прошу проверить начисления за январь месяц",
        status: "new",
        plotNumber: "Березовая, 12",
        authorName: "Иван Иванов",
        authorPhone: "+7 900 123-45-67",
      };
      expect(checkDataCompleteness(appeal)).toBe(true);
    });

    it("возвращает false если нет участка", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос",
        body: "Прошу проверить",
        status: "new",
        authorName: "Иван Иванов",
      };
      expect(checkDataCompleteness(appeal)).toBe(false);
    });

    it("возвращает false если нет контакта", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос",
        body: "Прошу проверить",
        status: "new",
        plotNumber: "Березовая, 12",
      };
      expect(checkDataCompleteness(appeal)).toBe(false);
    });

    it("возвращает false если заголовок слишком короткий", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "В",
        body: "Прошу проверить начисления за январь месяц",
        status: "new",
        plotNumber: "Березовая, 12",
        authorName: "Иван Иванов",
      };
      expect(checkDataCompleteness(appeal)).toBe(false);
    });

    it("возвращает false если текст слишком короткий", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос по начислениям",
        body: "Коротко",
        status: "new",
        plotNumber: "Березовая, 12",
        authorName: "Иван Иванов",
      };
      expect(checkDataCompleteness(appeal)).toBe(false);
    });
  });

  describe("triageAppeal", () => {
    it("возвращает insufficient_data если данных недостаточно", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос",
        body: "Коротко",
        status: "new",
      };
      const result = triageAppeal(appeal);
      expect(result.category).toBe("insufficient_data");
      expect(result.needsInfo).toBe(true);
    });

    it("определяет категорию если данных достаточно", () => {
      const appeal: Appeal = {
        id: "a1",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        title: "Вопрос по оплате",
        body: "Прошу проверить оплату и взносы за январь месяц",
        status: "new",
        plotNumber: "Березовая, 12",
        authorName: "Иван Иванов",
        authorPhone: "+7 900 123-45-67",
      };
      const result = triageAppeal(appeal);
      expect(result.category).toBe("finance");
      expect(result.assigneeRole).toBe("accountant");
    });
  });
});
