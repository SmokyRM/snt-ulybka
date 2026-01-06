export type KnowledgeArticle = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  content: string;
  tags: string[];
  updatedAt: string;
  documentSlugs: string[];
  published?: boolean;
};

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    slug: "how-to-get-access",
    title: "Как получить доступ к кабинету",
    summary: "Коротко о шагах: вход, участок, проверка и сроки.",
    category: "Доступ",
    content:
      "# Как получить доступ\n\n" +
      "1) Нажмите «Войти» и укажите email или телефон.\n" +
      "2) Введите адрес участка или кадастровый номер.\n" +
      "3) Правление проверит заявку за 1–2 рабочих дня.\n\n" +
      "Если нужны уточнения, мы напишем в кабинете. " +
      "Документы запрашиваются только при необходимости.",
    tags: ["доступ", "регистрация", "проверка"],
    updatedAt: "2025-01-04",
    documentSlugs: ["regulations"],
    published: true,
  },
  {
    slug: "fees-and-payments",
    title: "Взносы и платежи: что важно знать",
    summary: "Где увидеть начисления и как оплатить.",
    category: "Финансы",
    content:
      "## Где посмотреть начисления\n\n" +
      "- Зайдите в кабинет\n" +
      "- Откройте раздел «Финансы»\n" +
      "- Посмотрите начисления и историю платежей\n\n" +
      "Если данных нет, свяжитесь с правлением.",
    tags: ["взносы", "платежи", "финансы"],
    updatedAt: "2025-01-04",
    documentSlugs: ["bank-details"],
    published: true,
  },
  {
    slug: "electricity-readings",
    title: "Передача показаний электроэнергии",
    summary: "Как передать показания и где увидеть статус.",
    category: "Электроэнергия",
    content:
      "## Передача показаний\n\n" +
      "Введите текущие показания в разделе «Электроэнергия». " +
      "Срок передачи указан в кабинете.\n\n" +
      "## Если не успели\n\n" +
      "Напишите в правление, мы подскажем, как корректно закрыть период.",
    tags: ["электроэнергия", "показания", "счетчик"],
    updatedAt: "2025-01-04",
    documentSlugs: ["meter-form"],
    published: true,
  },
  {
    slug: "documents-and-protocols",
    title: "Документы СНТ и протоколы",
    summary: "Где найти устав и решения правления.",
    category: "Документы",
    content:
      "## Документы\n\n" +
      "В разделе «Документы» публикуются устав и протоколы. " +
      "Если нужен документ, которого нет в списке, напишите в правление.",
    tags: ["документы", "устав", "протоколы"],
    updatedAt: "2025-01-04",
    documentSlugs: ["charter"],
    published: true,
  },
  {
    slug: "contacts-and-appeals",
    title: "Как связаться с правлением",
    summary: "Каналы связи и обращения.",
    category: "Контакты",
    content:
      "## Каналы связи\n\n" +
      "- Телефон\n" +
      "- Telegram\n" +
      "- Email\n\n" +
      "Если вопрос требует официального ответа, оставьте обращение в кабинете.",
    tags: ["контакты", "обращения"],
    updatedAt: "2025-01-04",
    documentSlugs: ["appeal-template"],
    published: true,
  },
  {
    slug: "verification-status",
    title: "Статусы проверки участка",
    summary: "Что означают «на проверке» и «нужны уточнения».",
    category: "Проверка",
    content:
      "## Статусы\n\n" +
      "- На проверке: заявка рассматривается 1–2 дня.\n" +
      "- Нужны уточнения: мы попросим дополнительные данные.\n" +
      "- Подтверждено: доступ открыт.\n\n" +
      "Проверка нужна, чтобы защитить данные жителей.",
    tags: ["проверка", "статус"],
    updatedAt: "2025-01-04",
    documentSlugs: ["verification-policy"],
    published: true,
  },
];
