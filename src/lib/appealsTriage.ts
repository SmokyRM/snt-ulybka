import type { Appeal, AppealCategory } from "./office/types";

// Re-export для обратной совместимости
export type { AppealCategory };

export type TriageResult = {
  category: AppealCategory;
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
  priority?: "low" | "medium" | "high";
  needsInfo?: boolean;
};

/**
 * Правила категоризации обращений по ключевым словам
 */
const CATEGORY_RULES: Array<{
  category: AppealCategory;
  keywords: string[];
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin";
  priority?: "low" | "medium" | "high";
  needsInfo?: boolean;
}> = [
  {
    category: "electricity",
    keywords: [
      "электричество",
      "электроэнергия",
      "счетчик",
      "киловатт",
      "квт",
      "кwh",
      "тариф",
      "начисление электро",
    ],
    assigneeRole: "accountant",
    priority: "medium",
  },
  {
    category: "finance",
    keywords: [
      "взнос",
      "оплата",
      "платеж",
      "начисление",
      "долг",
      "задолженность",
      "перерасчет",
      "реквизиты",
      "счет",
      "квитанция",
      "банк",
    ],
    assigneeRole: "accountant",
    priority: "medium",
  },
  {
    category: "documents",
    keywords: [
      "документ",
      "копия",
      "протокол",
      "справка",
      "выписка",
      "договор",
      "соглашение",
      "устав",
    ],
    assigneeRole: "secretary",
    priority: "low",
  },
  {
    category: "access",
    keywords: [
      "доступ",
      "код",
      "пароль",
      "вход",
      "кабинет",
      "логин",
      "регистрация",
      "аккаунт",
    ],
    assigneeRole: "secretary",
    priority: "high",
  },
  {
    category: "membership",
    keywords: [
      "членство",
      "член снт",
      "вступить",
      "прием",
      "исключение",
      "выход",
    ],
    assigneeRole: "chairman",
    priority: "medium",
  },
  {
    category: "insufficient_data",
    keywords: [
      "не знаю",
      "не помню",
      "не указано",
      "нет данных",
      "не указан",
      "не знаю",
      "как узнать",
      "где найти",
    ],
    assigneeRole: "secretary",
    priority: "low",
    needsInfo: true,
  },
];

/**
 * Определяет категорию обращения на основе текста
 */
export function categorizeAppeal(appeal: { title: string; body: string }): TriageResult {
  const text = `${appeal.title} ${appeal.body}`.toLowerCase();

  // Проверяем правила по порядку (первое совпадение)
  for (const rule of CATEGORY_RULES) {
    const matches = rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    if (matches) {
      return {
        category: rule.category,
        assigneeRole: rule.assigneeRole ?? "secretary",
        priority: rule.priority ?? "medium",
        needsInfo: rule.needsInfo ?? false,
      };
    }
  }

  // Дефолтная категория
  return {
    category: "general",
    assigneeRole: "secretary",
    priority: "medium",
    needsInfo: false,
  };
}

/**
 * Проверяет, достаточно ли данных в обращении
 */
export function checkDataCompleteness(appeal: Appeal): boolean {
  // Проверяем наличие обязательных данных
  const hasTitle = Boolean(appeal.title && appeal.title.trim().length >= 5);
  const hasBody = Boolean(appeal.body && appeal.body.trim().length >= 10);
  const hasPlotNumber = Boolean(appeal.plotNumber && appeal.plotNumber.trim());
  const hasContact = Boolean(appeal.authorPhone || appeal.authorName);

  // Если нет контакта или участка, считаем что данных недостаточно
  if (!hasContact || !hasPlotNumber) {
    return false;
  }

  // Если текст слишком короткий, данных недостаточно
  if (!hasTitle || !hasBody) {
    return false;
  }

  return true;
}

/**
 * Получить результат triage для обращения
 */
export function triageAppeal(appeal: Appeal): TriageResult {
  // Сначала проверяем полноту данных
  const hasEnoughData = checkDataCompleteness(appeal);
  if (!hasEnoughData) {
    return {
      category: "insufficient_data",
      assigneeRole: "secretary",
      priority: "low",
      needsInfo: true,
    };
  }

  // Определяем категорию по ключевым словам
  return categorizeAppeal(appeal);
}
