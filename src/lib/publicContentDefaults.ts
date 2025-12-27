export type PublicContentContacts = {
  phone: string;
  email: string;
  telegram: string;
  vk: string;
};

export type PublicContentPaymentDetails = {
  receiver: string;
  inn: string;
  kpp: string;
  account: string;
  bank: string;
  bic: string;
  corr: string;
};

export type PublicContentFaqItem = {
  question: string;
  answer: string;
};

export type PublicDocumentItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  downloadUrl: string;
};

export type PublicDocumentCategory = {
  key: string;
  label: string;
  documents: PublicDocumentItem[];
};

export type PublicContent = {
  contacts: PublicContentContacts;
  paymentDetails: PublicContentPaymentDetails;
  accessSteps: string[];
  faq: PublicContentFaqItem[];
  documentsByCategory: PublicDocumentCategory[];
};

export const PUBLIC_CONTENT_DEFAULTS: PublicContent = {
  contacts: {
    phone: "+7 (000) 000-00-00",
    email: "info@snt-ulybka.ru",
    telegram: "https://t.me/snt_smile",
    vk: "https://vk.com/snt_smile?t2fs=07b664f4ccd18da444_3",
  },
  paymentDetails: {
    receiver: "СК «Улыбка»",
    inn: "7423007708",
    kpp: "745901001",
    account: "40703810407950000058",
    bank: "ПАО «Челиндбанк»",
    bic: "047501711",
    corr: "30101810400000000711",
  },
  accessSteps: [
    "Найдите код доступа у правления",
    "Введите код на странице входа",
    "Заполните профиль и подтвердите участок",
  ],
  faq: [
    {
      question: "Как оплатить взносы?",
      answer: "Реквизиты и назначения доступны в личном кабинете после входа.",
    },
    {
      question: "Как передать показания?",
      answer: "Передача показаний доступна в разделе «Электроэнергия» в кабинете.",
    },
    {
      question: "Что делать новому собственнику?",
      answer: "Заполните профиль и запросите код участка у правления.",
    },
    {
      question: "Где найти документы?",
      answer: "Официальные документы доступны в личном кабинете и в разделе «Документы».",
    },
    {
      question: "Как связаться с правлением?",
      answer: "Контакты указаны в разделе «Контакты» и на странице «О портале».",
    },
  ],
  documentsByCategory: [
    {
      key: "charter",
      label: "Устав",
      documents: [
        {
          id: "charter-2020",
          title: "Устав СНТ «Улыбка»",
          date: "2020-05-18",
          description: "Действующая редакция устава товарищества.",
          downloadUrl: "/docs/charter.pdf",
        },
      ],
    },
    {
      key: "meetings",
      label: "Протоколы собраний",
      documents: [
        {
          id: "protocol-2024-01",
          title: "Протокол общего собрания №1/2024",
          date: "2024-03-12",
          description: "Решения и итоги общего собрания членов СНТ.",
          downloadUrl: "/docs/protocol-2024-01.pdf",
        },
      ],
    },
    {
      key: "fees",
      label: "Взносы / тарифы",
      documents: [
        {
          id: "fees-2025",
          title: "Размеры взносов на 2025 год",
          date: "2025-01-20",
          description: "Текущие ставки членских и целевых взносов.",
          downloadUrl: "/docs/fees-2025.pdf",
        },
      ],
    },
    {
      key: "electricity",
      label: "Электричество",
      documents: [
        {
          id: "electricity-tariff-2025",
          title: "Тарифы на электроэнергию (2025)",
          date: "2025-02-05",
          description: "Информация о тарифе и порядке оплаты.",
          downloadUrl: "/docs/electricity-tariff-2025.pdf",
        },
      ],
    },
    {
      key: "templates",
      label: "Шаблоны заявлений",
      documents: [
        {
          id: "template-membership",
          title: "Заявление о вступлении / подтверждении",
          date: "2023-09-01",
          description: "Шаблон заявления для членов СНТ.",
          downloadUrl: "/docs/template-membership.pdf",
        },
      ],
    },
  ],
};
