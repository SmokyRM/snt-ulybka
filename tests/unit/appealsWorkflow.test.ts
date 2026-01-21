import { describe, it, expect } from "vitest";
import {
  isTransitionAllowed,
  getAllowedTransitions,
  validateTransition,
  ALLOWED_TRANSITIONS,
} from "@/lib/appealsWorkflow";
import type { AppealStatus } from "@/lib/office/types";

describe("appealsWorkflow", () => {
  describe("isTransitionAllowed", () => {
    it("разрешает остаться в том же статусе", () => {
      expect(isTransitionAllowed("new", "new")).toBe(true);
      expect(isTransitionAllowed("in_progress", "in_progress")).toBe(true);
      expect(isTransitionAllowed("closed", "closed")).toBe(true);
    });

    it("разрешает переходы из new", () => {
      expect(isTransitionAllowed("new", "in_progress")).toBe(true);
      expect(isTransitionAllowed("new", "needs_info")).toBe(true);
      expect(isTransitionAllowed("new", "closed")).toBe(true);
    });

    it("разрешает переходы из in_progress", () => {
      expect(isTransitionAllowed("in_progress", "needs_info")).toBe(true);
      expect(isTransitionAllowed("in_progress", "closed")).toBe(true);
    });

    it("разрешает переходы из needs_info", () => {
      expect(isTransitionAllowed("needs_info", "in_progress")).toBe(true);
      expect(isTransitionAllowed("needs_info", "closed")).toBe(true);
    });

    it("запрещает переходы из closed", () => {
      expect(isTransitionAllowed("closed", "new")).toBe(false);
      expect(isTransitionAllowed("closed", "in_progress")).toBe(false);
      expect(isTransitionAllowed("closed", "needs_info")).toBe(false);
    });

    it("запрещает недопустимые переходы", () => {
      expect(isTransitionAllowed("in_progress", "new")).toBe(false);
      expect(isTransitionAllowed("needs_info", "new")).toBe(false);
    });
  });

  describe("getAllowedTransitions", () => {
    it("возвращает допустимые переходы из new", () => {
      const transitions = getAllowedTransitions("new");
      expect(transitions).toContain("in_progress");
      expect(transitions).toContain("needs_info");
      expect(transitions).toContain("closed");
      expect(transitions.length).toBe(3);
    });

    it("возвращает допустимые переходы из in_progress", () => {
      const transitions = getAllowedTransitions("in_progress");
      expect(transitions).toContain("needs_info");
      expect(transitions).toContain("closed");
      expect(transitions.length).toBe(2);
    });

    it("возвращает допустимые переходы из needs_info", () => {
      const transitions = getAllowedTransitions("needs_info");
      expect(transitions).toContain("in_progress");
      expect(transitions).toContain("closed");
      expect(transitions.length).toBe(2);
    });

    it("возвращает пустой массив для closed", () => {
      const transitions = getAllowedTransitions("closed");
      expect(transitions).toEqual([]);
    });
  });

  describe("validateTransition", () => {
    it("валидирует допустимые переходы", () => {
      expect(validateTransition("new", "in_progress").valid).toBe(true);
      expect(validateTransition("new", "needs_info").valid).toBe(true);
      expect(validateTransition("in_progress", "closed").valid).toBe(true);
      expect(validateTransition("needs_info", "in_progress").valid).toBe(true);
    });

    it("валидирует остаться в том же статусе", () => {
      expect(validateTransition("new", "new").valid).toBe(true);
      expect(validateTransition("in_progress", "in_progress").valid).toBe(true);
    });

    it("отклоняет недопустимые переходы", () => {
      const result = validateTransition("closed", "new");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("недопустим");
    });

    it("отклоняет переходы из closed", () => {
      const result = validateTransition("closed", "in_progress");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("отклоняет обратные переходы", () => {
      const result = validateTransition("in_progress", "new");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
