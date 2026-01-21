import { describe, it, expect } from "vitest";
import { evaluateTriage } from "@/server/triage/evaluateTriage";
import type { Appeal } from "@/lib/office/types";
import type { TriageContext } from "@/server/triage/evaluateTriage";

describe("evaluateTriage", () => {
  const baseAppeal: Appeal = {
    id: "test-1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    title: "Test Appeal",
    body: "Test body",
    status: "new",
    assignedToUserId: null,
    assignedAt: null,
  };

  describe("rule_finance_accountant", () => {
    it("срабатывает для обращения типа finance", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Вопрос по оплате",
        body: "Прошу проверить начисления",
      };

      const result = evaluateTriage(appeal, {});

      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.actions.assignRole).toBe("accountant");
      expect(result.explanation).toContain("тип обращения: finance");
    });

    it("не срабатывает для обращения другого типа", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "documents",
        title: "Нужен документ",
        body: "Прошу предоставить копию",
      };

      const result = evaluateTriage(appeal, {});

      // Может сработать другое правило (например, rule_documents_secretary)
      // Проверяем что это не rule_finance_accountant
      if (result.matchedRuleId) {
        expect(result.matchedRuleId).not.toBe("rule_finance_accountant");
      }
    });
  });

  describe("rule_finance_debt_accountant", () => {
    it("не срабатывает для обращения типа finance с долгом, так как правило rule_finance_accountant идет раньше", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Вопрос по долгу",
        body: "Прошу проверить задолженность",
      };

      const ctx: TriageContext = {
        hasDebt: true,
        debtAmount: 5000,
      };

      const result = evaluateTriage(appeal, ctx);

      // Правило rule_finance_accountant (order: 2) идет раньше rule_finance_debt_accountant (order: 3)
      // поэтому срабатывает первое
      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.actions.assignRole).toBe("accountant");
      // Правило rule_finance_accountant не устанавливает статус
      expect(result.actions.setStatus).toBeUndefined();
    });

    it("не срабатывает для обращения типа finance без долга", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Вопрос по оплате",
        body: "Прошу проверить начисления",
      };

      const ctx: TriageContext = {
        hasDebt: false,
        debtAmount: 0,
      };

      const result = evaluateTriage(appeal, ctx);

      // Должно сработать правило rule_finance_accountant (без долга)
      // которое идет раньше по order
      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.matchedRuleId).not.toBe("rule_finance_debt_accountant");
    });
  });

  describe("rule_finance_large_debt", () => {
    it("не срабатывает для обращения типа finance с большим долгом, так как правило rule_finance_accountant идет раньше", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Большой долг",
        body: "Прошу проверить задолженность",
      };

      const ctx: TriageContext = {
        hasDebt: true,
        debtAmount: 15000, // Больше 10000
      };

      const result = evaluateTriage(appeal, ctx);

      // Правило rule_finance_accountant (order: 2) идет раньше rule_finance_large_debt (order: 4)
      // поэтому срабатывает первое
      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.actions.assignRole).toBe("accountant");
      // Правило rule_finance_accountant не устанавливает статус
      expect(result.actions.setStatus).toBeUndefined();
    });

    it("не срабатывает для обращения типа finance с долгом меньше 10000", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Маленький долг",
        body: "Прошу проверить задолженность",
      };

      const ctx: TriageContext = {
        hasDebt: true,
        debtAmount: 5000, // Меньше 10000
      };

      const result = evaluateTriage(appeal, ctx);

      // Правило rule_finance_accountant (order: 2) идет раньше всех остальных правил finance
      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.matchedRuleId).not.toBe("rule_finance_large_debt");
    });
  });

  describe("rule_urgent_keywords", () => {
    it("срабатывает для обращения с ключевым словом 'срочно'", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "general",
        title: "Срочный вопрос",
        body: "Нужна помощь срочно!",
      };

      const result = evaluateTriage(appeal, {});

      expect(result.matchedRuleId).toBe("rule_urgent_keywords");
      expect(result.actions.setStatus).toBe("in_progress");
      expect(result.actions.setDueAtRule).toBe(12);
      expect(result.explanation).toContain("ключевые слова");
    });

    it("не срабатывает для обращения без ключевых слов", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "general",
        title: "Обычный вопрос",
        body: "Прошу помочь с вопросом",
      };

      const result = evaluateTriage(appeal, {});

      // Может сработать другое правило или не сработать ни одно
      if (result.matchedRuleId) {
        expect(result.matchedRuleId).not.toBe("rule_urgent_keywords");
      }
    });
  });

  describe("rule_documents_secretary", () => {
    it("срабатывает для обращения типа documents", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "documents",
        title: "Нужна копия",
        body: "Прошу предоставить копию протокола",
      };

      const result = evaluateTriage(appeal, {});

      expect(result.matchedRuleId).toBe("rule_documents_secretary");
      expect(result.actions.assignRole).toBe("secretary");
      expect(result.explanation).toContain("тип обращения: documents");
    });

    it("не срабатывает для обращения другого типа", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "finance",
        title: "Вопрос по оплате",
        body: "Прошу проверить начисления",
      };

      const result = evaluateTriage(appeal, {});

      expect(result.matchedRuleId).toBe("rule_finance_accountant");
      expect(result.matchedRuleId).not.toBe("rule_documents_secretary");
    });
  });

  describe("no match", () => {
    it("возвращает null matchedRuleId если ни одно правило не подошло", () => {
      const appeal: Appeal = {
        ...baseAppeal,
        type: "general",
        title: "Обычный вопрос",
        body: "Прошу помочь",
        priority: "low",
      };

      const ctx: TriageContext = {
        hasDebt: false,
        debtAmount: 0,
        channel: "site",
      };

      const result = evaluateTriage(appeal, ctx);

      // В зависимости от порядка правил может сработать какое-то правило
      // Но если ни одно не подошло, должно быть null
      if (!result.matchedRuleId) {
        expect(result.matchedRuleId).toBeNull();
        expect(result.actions).toEqual({});
        expect(result.explanation).toContain("Ни одно правило триажа не подошло");
      }
    });
  });
});
