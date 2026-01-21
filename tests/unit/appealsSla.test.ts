import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateDueAt,
  calculateDueAtByType,
  DEFAULT_SLA_CONFIG_BY_TYPE,
  DEFAULT_SLA_HOURS,
  getSlaConfigByType,
} from "@/lib/appealsSla";
import type { AppealStatus, AppealCategory } from "@/lib/office/types";

describe("appealsSla", () => {
  beforeEach(() => {
    // Мокаем Date.now для стабильных тестов
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateDueAtByType (SLA v1)", () => {
    it("вычисляет dueAt для типа finance (48 часов)", () => {
      const dueAt = calculateDueAtByType("finance");
      const expected = new Date("2025-01-03T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа electricity (24 часа)", () => {
      const dueAt = calculateDueAtByType("electricity");
      const expected = new Date("2025-01-02T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа documents (72 часа)", () => {
      const dueAt = calculateDueAtByType("documents");
      const expected = new Date("2025-01-04T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа access (12 часов - срочно)", () => {
      const dueAt = calculateDueAtByType("access");
      const expected = new Date("2025-01-02T00:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа membership (72 часа)", () => {
      const dueAt = calculateDueAtByType("membership");
      const expected = new Date("2025-01-04T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа general (72 часа)", () => {
      const dueAt = calculateDueAtByType("general");
      const expected = new Date("2025-01-04T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для типа insufficient_data (24 часа)", () => {
      const dueAt = calculateDueAtByType("insufficient_data");
      const expected = new Date("2025-01-02T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("использует дефолт (72 часа) для неизвестного типа", () => {
      // Используем кастомный конфиг без неизвестного типа
      const customConfig = { finance: 48 };
      const dueAt = calculateDueAtByType("general" as AppealCategory, customConfig);
      const expected = new Date("2025-01-04T12:00:00.000Z"); // 72 часа по дефолту
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("принимает кастомную конфигурацию", () => {
      const customConfig = { finance: 96, access: 6 };
      const dueAt = calculateDueAtByType("finance", customConfig);
      const expected = new Date("2025-01-05T12:00:00.000Z"); // 96 часов = 4 дня
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("возвращает валидную ISO строку", () => {
      const dueAt = calculateDueAtByType("finance");
      expect(() => new Date(dueAt)).not.toThrow();
      expect(new Date(dueAt).toISOString()).toBe(dueAt);
    });
  });

  describe("calculateDueAt (legacy)", () => {
    it("вычисляет dueAt для статуса new (24 часа)", () => {
      const dueAt = calculateDueAt("new");
      const expected = new Date("2025-01-02T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для статуса in_progress (72 часа = 3 дня)", () => {
      const dueAt = calculateDueAt("in_progress");
      const expected = new Date("2025-01-04T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("вычисляет dueAt для статуса needs_info (48 часов = 2 дня)", () => {
      const dueAt = calculateDueAt("needs_info");
      const expected = new Date("2025-01-03T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });

    it("использует дефолт для closed (24 часа)", () => {
      const dueAt = calculateDueAt("closed");
      const expected = new Date("2025-01-02T12:00:00.000Z");
      expect(new Date(dueAt).getTime()).toBe(expected.getTime());
    });
  });

  describe("DEFAULT_SLA_CONFIG_BY_TYPE", () => {
    it("содержит правильные значения для всех типов", () => {
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.finance).toBe(48);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.electricity).toBe(24);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.documents).toBe(72);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.access).toBe(12);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.membership).toBe(72);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.general).toBe(72);
      expect(DEFAULT_SLA_CONFIG_BY_TYPE.insufficient_data).toBe(24);
    });
  });

  describe("DEFAULT_SLA_HOURS", () => {
    it("равен 72 часам", () => {
      expect(DEFAULT_SLA_HOURS).toBe(72);
    });
  });

  describe("getSlaConfigByType", () => {
    it("возвращает дефолтную конфигурацию", () => {
      const config = getSlaConfigByType();
      expect(config).toEqual(DEFAULT_SLA_CONFIG_BY_TYPE);
    });
  });
});
