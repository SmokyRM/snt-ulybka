const templates = {
  water: {
    official:
      "По вашему обращению {{appealId}} по водоснабжению. Данные зарегистрированы {{createdAt}}. Участок: {{plotNumber}} ({{street}}). Мы проверим показания и сообщим о результате."
      + "\n\nЕсли потребуется доступ, свяжемся с вами: {{authorName}}."
      + "\n\nСпасибо, что держите в курсе, {{siteName}}.",
    short:
      "Приняли обращение {{appealId}} по воде. Проверим данные по участку {{plotNumber}} и вернёмся с ответом."
      + "\nЕсли понадобится доступ, напишем.",
  },
  electricity: {
    official:
      "Обращение {{appealId}} по электроснабжению зарегистрировано {{createdAt}}."
      + "\nПроверяем показания по участку {{plotNumber}} ({{street}}). После сверки начислений сообщим результат."
      + "\nЕсли потребуется уточнить доступ, напишем вам, {{authorName}}.",
    short:
      "Приняли обращение по электричеству. Проверяем участок {{plotNumber}}, ответим после сверки начислений.",
  },
  roads: {
    official:
      "Зафиксировали обращение {{appealId}} по дорогам (участок {{plotNumber}}, {{street}})."
      + "\nПередали в ответственного, работы запланируем и сообщим сроки."
      + "\nСпасибо за сигнал, {{authorName}}.",
    short:
      "Получили сообщение по дорогам. Передали в работу, сообщим сроки.",
  },
  fees: {
    official:
      "Обращение {{appealId}} по взносам/начислениям."
      + "\nПроверим начисления за указанный период и пришлём детализацию."
      + "\nЕсли нужно, уточните год/вид взноса."
      + "\n{{siteName}}.",
    short:
      "Проверяем начисления. Нужен период и вид взноса, чтобы дать сумму.",
  },
  documents: {
    official:
      "Запрос {{appealId}} на документы принят."
      + "\nПодготовим копии и отправим. Если нужен оригинал/заверенная копия — уточните."
      + "\nСпасибо, {{authorName}}.",
    short:
      "Готовим документы по запросу. Уточните, нужна ли заверенная копия.",
  },
  other: {
    official:
      "Обращение {{appealId}} получено {{createdAt}}."
      + "\nРассмотрим и вернёмся с уточнениями. Участок: {{plotNumber}} ({{street}})."
      + "\n{{siteName}}.",
    short:
      "Обращение приняли, вернёмся с ответом. Если важен срок — напишите, когда удобно.",
  },
} as const;

export type ReplyCategory = keyof typeof templates;
export type ReplyTone = "official" | "short";

export const renderTemplate = (template: string, ctx: Record<string, string>): string =>
  template.replace(/\{\{(.*?)\}\}/g, (_m, key) => ctx[key.trim()] ?? "");

export const generateReply = ({ category, tone, ctx }: { category: ReplyCategory; tone: ReplyTone; ctx: Record<string, string> }) =>
  renderTemplate(templates[category][tone], ctx);
