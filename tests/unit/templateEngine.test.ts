import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  extractVariables,
  extractAllVariables,
  TemplateMissingVarError,
  maskContact,
} from "@/lib/notifications/templateEngine";

describe("templateEngine", () => {
  describe("extractVariables", () => {
    it("extracts variable names from text", () => {
      const vars = extractVariables("Hello {{fullName}}, plot {{plotNumber}}");
      expect(vars).toEqual(["fullName", "plotNumber"]);
    });

    it("returns empty array for no variables", () => {
      expect(extractVariables("No variables here")).toEqual([]);
    });

    it("deduplicates variables", () => {
      const vars = extractVariables("{{name}} and {{name}} again");
      expect(vars).toEqual(["name"]);
    });
  });

  describe("extractAllVariables", () => {
    it("extracts from subject and body", () => {
      const vars = extractAllVariables("Re: {{period}}", "Dear {{fullName}}");
      expect(vars).toContain("period");
      expect(vars).toContain("fullName");
    });

    it("handles null subject", () => {
      const vars = extractAllVariables(null, "{{debtAmount}} руб.");
      expect(vars).toEqual(["debtAmount"]);
    });
  });

  describe("renderTemplate", () => {
    it("substitutes variables in body", () => {
      const result = renderTemplate(
        { body: "Hello {{fullName}}, your debt is {{debtAmount}} руб." },
        { fullName: "Иванов", debtAmount: 5000 },
        "telegram",
      );
      expect(result.body).toBe("Hello Иванов, your debt is 5000 руб.");
      expect(result.subject).toBeUndefined();
    });

    it("substitutes variables in subject and body", () => {
      const result = renderTemplate(
        { subject: "Долг за {{period}}", body: "{{fullName}}, оплатите {{debtAmount}}" },
        { period: "2026-01", fullName: "Петров", debtAmount: 3000 },
        "email",
      );
      expect(result.subject).toBe("Долг за 2026-01");
      expect(result.body).toBe("Петров, оплатите 3000");
    });

    it("escapes HTML for email channel", () => {
      const result = renderTemplate(
        { body: "Name: {{fullName}}" },
        { fullName: '<script>alert("xss")</script>' },
        "email",
      );
      expect(result.body).toBe('Name: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it("escapes HTML for print channel", () => {
      const result = renderTemplate(
        { body: "{{value}}" },
        { value: "A & B > C" },
        "print",
      );
      expect(result.body).toBe("A &amp; B &gt; C");
    });

    it("does NOT escape for telegram channel", () => {
      const result = renderTemplate(
        { body: "{{value}}" },
        { value: "<b>bold</b>" },
        "telegram",
      );
      expect(result.body).toBe("<b>bold</b>");
    });

    it("does NOT escape for sms channel", () => {
      const result = renderTemplate(
        { body: "{{value}}" },
        { value: "A & B" },
        "sms",
      );
      expect(result.body).toBe("A & B");
    });

    it("throws TemplateMissingVarError for missing variable in strict mode", () => {
      expect(() =>
        renderTemplate(
          { body: "Hello {{fullName}}, debt {{debtAmount}}" },
          { fullName: "Test" },
          "telegram",
        ),
      ).toThrow(TemplateMissingVarError);

      try {
        renderTemplate(
          { body: "{{missing}}" },
          {},
          "telegram",
        );
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateMissingVarError);
        expect((err as TemplateMissingVarError).variableName).toBe("missing");
      }
    });

    it("leaves placeholder in soft mode for missing variable", () => {
      const result = renderTemplate(
        { body: "Hello {{fullName}}, debt {{debtAmount}}" },
        { fullName: "Test" },
        "telegram",
        { softMode: true },
      );
      expect(result.body).toBe("Hello Test, debt {{debtAmount}}");
    });
  });

  describe("maskContact", () => {
    it("masks phone numbers", () => {
      expect(maskContact("+79991234567")).toBe("+7***4567");
    });

    it("masks email addresses", () => {
      expect(maskContact("user@example.com")).toBe("u***@example.com");
    });

    it("masks other strings", () => {
      expect(maskContact("longstring")).toBe("lo***ng");
    });

    it("returns *** for short strings", () => {
      expect(maskContact("short")).toBe("***");
    });
  });
});
