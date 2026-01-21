import type { AppealCategory, AppealStatus } from "@/lib/office/types";

/**
 * Условия для правила триажа (when)
 */
export type TriageRuleCondition = {
  /** Точное совпадение типа обращения */
  type?: AppealCategory;
  /** Точное совпадение приоритета */
  priority?: "low" | "medium" | "high";
  /** Ключевые слова (хотя бы одно должно быть в тексте) */
  keywords?: string[];
  /** Канал обращения */
  channel?: "none" | "site" | "email" | "telegram";
  /** Есть ли долг у автора */
  hasDebt?: boolean;
  /** Сумма долга больше указанной (в рублях) */
  amountGt?: number;
};

/**
 * Действия правила триажа (then)
 */
export type TriageRuleAction = {
  /** Назначить роль исполнителя */
  assignRole?: "chairman" | "secretary" | "accountant" | "admin";
  /** Установить статус */
  setStatus?: AppealStatus;
  /** Установить срок выполнения (в часах от текущего момента) */
  setDueAtRule?: number;
  /** Добавить тег (для будущего использования) */
  addTag?: string;
};

/**
 * Правило триажа обращения
 */
export type TriageRule = {
  /** Уникальный ID правила */
  id: string;
  /** Название правила для отображения и логирования */
  title: string;
  /** Условия применения правила */
  when: TriageRuleCondition;
  /** Действия при совпадении условия */
  then: TriageRuleAction;
  /** Порядок применения (меньше = раньше, по умолчанию 100) */
  order?: number;
  /** Включено ли правило (по умолчанию true) */
  enabled?: boolean;
};

/**
 * Конфигурация правил авто-триажа обращений
 * Правила применяются по порядку (order), первое совпадение выполняется
 */
export const TRIAGE_RULES: TriageRule[] = [
  {
    id: "rule_high_priority_access",
    title: "Высокий приоритет: доступ",
    when: {
      type: "access",
      priority: "high",
    },
    then: {
      assignRole: "secretary",
      setStatus: "in_progress",
      setDueAtRule: 6, // 6 часов для срочных вопросов доступа
    },
    order: 1,
    enabled: true,
  },
  {
    id: "rule_finance_accountant",
    title: "Финансы -> бухгалтер",
    when: {
      type: "finance",
    },
    then: {
      assignRole: "accountant",
    },
    order: 2,
    enabled: true,
  },
  {
    id: "rule_finance_debt_accountant",
    title: "Финансы с долгом -> бухгалтер",
    when: {
      type: "finance",
      hasDebt: true,
    },
    then: {
      assignRole: "accountant",
      setStatus: "in_progress",
    },
    order: 3,
    enabled: true,
  },
  {
    id: "rule_finance_large_debt",
    title: "Большой долг (>10000) -> бухгалтер, высокий приоритет",
    when: {
      type: "finance",
      amountGt: 10000,
    },
    then: {
      assignRole: "accountant",
      setStatus: "in_progress",
      setDueAtRule: 24, // 24 часа для больших долгов
    },
    order: 4,
    enabled: true,
  },
  {
    id: "rule_electricity_accountant",
    title: "Электроэнергия -> бухгалтер",
    when: {
      type: "electricity",
    },
    then: {
      assignRole: "accountant",
    },
    order: 5,
    enabled: true,
  },
  {
    id: "rule_documents_secretary",
    title: "Документы -> секретарь",
    when: {
      type: "documents",
    },
    then: {
      assignRole: "secretary",
    },
    order: 6,
    enabled: true,
  },
  {
    id: "rule_membership_chairman",
    title: "Членство -> председатель",
    when: {
      type: "membership",
    },
    then: {
      assignRole: "chairman",
    },
    order: 7,
    enabled: true,
  },
  {
    id: "rule_insufficient_data_status",
    title: "Недостаточно данных -> needs_info",
    when: {
      type: "insufficient_data",
    },
    then: {
      setStatus: "needs_info",
    },
    order: 8,
    enabled: true,
  },
  {
    id: "rule_urgent_keywords",
    title: "Срочные ключевые слова -> высокий приоритет",
    when: {
      keywords: ["срочно", "срочно!", "urgent", "критично", "авария", "не работает"],
    },
    then: {
      setStatus: "in_progress",
      setDueAtRule: 12, // 12 часов для срочных
    },
    order: 9,
    enabled: true,
  },
  {
    id: "rule_high_priority_fast",
    title: "Высокий приоритет -> быстрый срок",
    when: {
      priority: "high",
    },
    then: {
      setDueAtRule: 24, // 24 часа для высокого приоритета
    },
    order: 10,
    enabled: true,
  },
  {
    id: "rule_telegram_channel",
    title: "Telegram -> секретарь",
    when: {
      channel: "telegram",
    },
    then: {
      assignRole: "secretary",
    },
    order: 11,
    enabled: true,
  },
];
