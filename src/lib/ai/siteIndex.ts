type AudienceRole = "guest" | "user" | "board" | "chair" | "admin";

export type SiteIndexEntry = {
  href: string;
  title: string;
  description: string;
  keywords: string[];
  audience?: AudienceRole[];
};

export const SITE_INDEX: SiteIndexEntry[] = [
  {
    href: "/access",
    title: "Как получить доступ",
    description: "Инструкция по входу и подтверждению доступа.",
    keywords: ["доступ", "вход", "регистрация", "код", "проверка"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/login",
    title: "Войти в кабинет",
    description: "Форма входа в личный кабинет.",
    keywords: ["войти", "логин", "кабинет", "пароль", "код"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/docs",
    title: "Документы",
    description: "Устав, протоколы и официальные документы СНТ.",
    keywords: ["документы", "устав", "протокол", "решения", "реквизиты"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/cabinet?section=docs",
    title: "Документы (кабинет)",
    description: "Раздел документов в личном кабинете.",
    keywords: ["кабинет", "документы", "личный"],
    audience: ["user", "board", "admin", "chair"],
  },
  {
    href: "/fees",
    title: "Взносы и начисления",
    description: "Информация об оплате и начислениях.",
    keywords: ["взносы", "оплата", "начисления", "долги", "реквизиты"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/cabinet?section=finance",
    title: "Финансы (кабинет)",
    description: "Взносы, начисления и оплаты в личном кабинете.",
    keywords: ["кабинет", "взносы", "финансы", "оплаты", "начисления"],
    audience: ["user", "board", "admin", "chair"],
  },
  {
    href: "/electricity",
    title: "Электроэнергия",
    description: "Показания и начисления по электроэнергии.",
    keywords: ["электроэнергия", "показания", "счетчик", "тариф"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/cabinet?section=electricity",
    title: "Электроэнергия (кабинет)",
    description: "Показания и начисления в личном кабинете.",
    keywords: ["кабинет", "электроэнергия", "показания", "счетчик"],
    audience: ["user", "board", "admin", "chair"],
  },
  {
    href: "/contacts",
    title: "Контакты правления",
    description: "Связь с правлением и официальные каналы.",
    keywords: ["контакты", "правление", "телефон", "почта", "телеграм"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge",
    title: "База знаний",
    description: "Короткие инструкции и ответы по порталу.",
    keywords: ["база знаний", "статьи", "инструкции", "вопросы"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/how-to-get-access",
    title: "Как получить доступ",
    description: "Шаги входа и проверки доступа.",
    keywords: ["доступ", "вход", "регистрация", "проверка"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/fees-and-payments",
    title: "Взносы и платежи",
    description: "Где увидеть начисления и как оплатить.",
    keywords: ["взносы", "оплата", "реквизиты", "начисления"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/electricity-readings",
    title: "Передача показаний",
    description: "Показания, тарифы, статус передачи.",
    keywords: ["показания", "счетчик", "тариф", "электроэнергия"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/documents-and-protocols",
    title: "Документы и протоколы",
    description: "Устав, протоколы, решения.",
    keywords: ["документы", "устав", "протокол", "решения"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/contacts-and-appeals",
    title: "Контакты и обращения",
    description: "Как связаться с правлением и оставить обращение.",
    keywords: ["контакты", "обращение", "правление"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/knowledge/verification-status",
    title: "Статусы проверки",
    description: "Что означает «на проверке» или «нужны уточнения».",
    keywords: ["проверка", "статус", "подтверждение"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/help",
    title: "Справка",
    description: "Ответы на частые вопросы и подсказки.",
    keywords: ["справка", "вопросы", "помощь", "faq"],
    audience: ["guest", "user", "board", "admin"],
  },
  {
    href: "/cabinet/verification",
    title: "Проверка доступа",
    description: "Статус проверки доступа к кабинету.",
    keywords: ["проверка", "верификация", "статус", "доступ"],
    audience: ["user", "board", "admin"],
  },
];

const normalize = (value: string) => value.toLowerCase();

const toAudienceRole = (role?: string | null): AudienceRole => {
  if (role === "admin") return "admin";
  if (role === "chair") return "chair";
  if (role === "board") return "board";
  if (role === "user") return "user";
  return "guest";
};

const hasAudienceAccess = (entry: SiteIndexEntry, role: AudienceRole) => {
  if (!entry.audience || entry.audience.length === 0) return true;
  if (role === "chair") {
    return (
      entry.audience.includes("chair") ||
      entry.audience.includes("board") ||
      entry.audience.includes("admin") ||
      entry.audience.includes("user") ||
      entry.audience.includes("guest")
    );
  }
  return entry.audience.includes(role);
};

export const searchSiteIndex = (query: string, role?: string | null): SiteIndexEntry[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const roleKey = toAudienceRole(role);
  const scored = SITE_INDEX.map((entry) => {
    if (!hasAudienceAccess(entry, roleKey)) {
      return { entry, score: 0 };
    }
    const haystack = normalize(
      `${entry.title} ${entry.description} ${entry.keywords.join(" ")}`,
    );
    const score = tokens.reduce((acc, token) => {
      if (!token) return acc;
      return haystack.includes(token) ? acc + 1 : acc;
    }, 0);
    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.entry);
  return scored;
};
