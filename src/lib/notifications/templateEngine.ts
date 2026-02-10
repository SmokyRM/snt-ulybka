/**
 * Sprint 68 / Step 31: Template engine with safe variable substitution
 * Syntax: {{variableName}}
 * Supports HTML-escape for email/print, plain for telegram/sms
 */

export type TemplateChannel = "telegram" | "email" | "sms" | "print";

export interface TemplateVariable {
  name: string;
  label: string;
  example?: string;
}

export interface RenderResult {
  subject?: string;
  body: string;
}

const VAR_REGEX = /\{\{(\w+)\}\}/g;

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch] ?? ch);
}

function escapeValue(value: string, channel: TemplateChannel): string {
  if (channel === "email" || channel === "print") {
    return escapeHtml(value);
  }
  return value;
}

/** Extract variable names from template text */
export function extractVariables(text: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(VAR_REGEX.source, "g");
  while ((match = re.exec(text)) !== null) {
    vars.add(match[1]);
  }
  return [...vars];
}

/** Find variables used in template (subject + body) */
export function extractAllVariables(subject: string | null, body: string): string[] {
  const fromBody = extractVariables(body);
  const fromSubject = subject ? extractVariables(subject) : [];
  return [...new Set([...fromSubject, ...fromBody])];
}

export interface RenderOptions {
  /** If true, missing variables leave placeholder as-is instead of throwing */
  softMode?: boolean;
}

/**
 * Render template with variable substitution.
 * - In strict mode (default): throws if a variable is missing
 * - In soft mode: leaves {{var}} placeholder as-is
 */
export function renderTemplate(
  template: { subject?: string | null; body: string },
  vars: Record<string, string | number>,
  channel: TemplateChannel,
  options?: RenderOptions,
): RenderResult {
  const { softMode = false } = options ?? {};

  const substitute = (text: string): string => {
    return text.replace(VAR_REGEX, (_match, varName: string) => {
      const value = vars[varName];
      if (value === undefined || value === null) {
        if (softMode) return `{{${varName}}}`;
        throw new TemplateMissingVarError(varName);
      }
      return escapeValue(String(value), channel);
    });
  };

  const body = substitute(template.body);
  const subject = template.subject ? substitute(template.subject) : undefined;

  return { subject, body };
}

export class TemplateMissingVarError extends Error {
  public readonly variableName: string;
  constructor(variableName: string) {
    super(`Missing template variable: {{${variableName}}}`);
    this.name = "TemplateMissingVarError";
    this.variableName = variableName;
  }
}

/** Mask PII: +7***1234, email -> e***@d.com */
export function maskContact(contact: string): string {
  if (contact.startsWith("+")) {
    const last4 = contact.slice(-4);
    return `${contact.slice(0, 2)}***${last4}`;
  }
  const atIdx = contact.indexOf("@");
  if (atIdx > 0) {
    return `${contact[0]}***@${contact.slice(atIdx + 1)}`;
  }
  if (contact.length > 6) {
    return `${contact.slice(0, 2)}***${contact.slice(-2)}`;
  }
  return "***";
}
