"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { readOk } from "@/lib/api/client";

type PaymentDetails = {
  receiver: string;
  inn: string;
  kpp: string;
  account: string;
  bank: string;
  bankInn: string;
  bic: string;
  corr: string;
  address?: string;
  chairman?: string;
  chairmanPhone?: string;
  chairmanEmail?: string;
};

type OfficialChannels = {
  vk: string;
  telegram: string;
  email: string;
  phone: string;
};

type ContactsSetting = {
  phone?: string;
  email?: string;
  address?: string;
};

type ScheduleItem = {
  day: string;
  hours: string;
};

type ScheduleSetting = {
  items: ScheduleItem[];
};

type PublicPageSettings = {
  homeTitle?: string;
  homeDescription?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  helpTitle?: string;
  helpDescription?: string;
};

type Tab = "requisites" | "contacts" | "channels" | "schedule" | "pages";

export default function ContentSettingsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("requisites");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [requisites, setRequisites] = useState<PaymentDetails>({
    receiver: "",
    inn: "",
    kpp: "",
    account: "",
    bank: "",
    bankInn: "",
    bic: "",
    corr: "",
    address: "",
    chairman: "",
    chairmanPhone: "",
    chairmanEmail: "",
  });

  const [channels, setChannels] = useState<OfficialChannels>({
    vk: "",
    telegram: "",
    email: "",
    phone: "",
  });

  const [contacts, setContacts] = useState<ContactsSetting>({
    phone: "",
    email: "",
    address: "",
  });

  const [schedule, setSchedule] = useState<ScheduleSetting>({
    items: [],
  });

  const [pages, setPages] = useState<PublicPageSettings>({
    homeTitle: "",
    homeDescription: "",
    aboutTitle: "",
    aboutDescription: "",
    helpTitle: "",
    helpDescription: "",
  });

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [reqRes, chanRes, contRes, schedRes, pagesRes] = await Promise.all([
        fetch("/api/admin/settings/requisites"),
        fetch("/api/admin/settings/channels"),
        fetch("/api/admin/settings/contacts"),
        fetch("/api/admin/settings/schedule"),
        fetch("/api/admin/settings/pages"),
      ]);

      if (reqRes.ok) {
        const data = await readOk<{ value: PaymentDetails }>(reqRes);
        setRequisites(data.value || requisites);
      }
      if (chanRes.ok) {
        const data = await readOk<{ value: OfficialChannels }>(chanRes);
        setChannels(data.value || channels);
      }
      if (contRes.ok) {
        const data = await readOk<{ value: ContactsSetting }>(contRes);
        setContacts(data.value || contacts);
      }
      if (schedRes.ok) {
        const data = await readOk<{ value: ScheduleSetting }>(schedRes);
        setSchedule(data.value || schedule);
      }
      if (pagesRes.ok) {
        const data = await readOk<{ value: PublicPageSettings }>(pagesRes);
        setPages(data.value || pages);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const handleSaveRequisites = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/requisites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requisites),
      });
      await readOk(res);
      setMessage("Реквизиты сохранены");
      router.push("/admin/settings/content?saved=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChannels = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channels),
      });
      await readOk(res);
      setMessage("Каналы сохранены");
      router.push("/admin/settings/content?saved=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContacts = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contacts),
      });
      await readOk(res);
      setMessage("Контакты сохранены");
      router.push("/admin/settings/content?saved=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      await readOk(res);
      setMessage("Расписание сохранено");
      router.push("/admin/settings/content?saved=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePages = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pages),
      });
      await readOk(res);
      setMessage("Настройки страниц сохранены");
      router.push("/admin/settings/content?saved=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addScheduleItem = () => {
    setSchedule((prev) => ({
      ...prev,
      items: [...prev.items, { day: "", hours: "" }],
    }));
  };

  const removeScheduleItem = (index: number) => {
    setSchedule((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateScheduleItem = (index: number, field: "day" | "hours", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200">
        {[
          { id: "requisites" as Tab, label: "Реквизиты СНТ" },
          { id: "contacts" as Tab, label: "Контакты" },
          { id: "channels" as Tab, label: "Каналы связи" },
          { id: "schedule" as Tab, label: "Расписание" },
          { id: "pages" as Tab, label: "Публичные страницы" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-b-2 border-[#5E704F] text-[#5E704F]"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {/* Requisites Tab */}
      {activeTab === "requisites" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Реквизиты СНТ</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveRequisites();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Получатель *</span>
                <input
                  type="text"
                  value={requisites.receiver}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, receiver: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">ИНН *</span>
                <input
                  type="text"
                  value={requisites.inn}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, inn: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">КПП *</span>
                <input
                  type="text"
                  value={requisites.kpp}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, kpp: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Расчётный счёт *</span>
                <input
                  type="text"
                  value={requisites.account}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, account: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Банк *</span>
                <input
                  type="text"
                  value={requisites.bank}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, bank: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">ИНН банка *</span>
                <input
                  type="text"
                  value={requisites.bankInn}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, bankInn: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">БИК *</span>
                <input
                  type="text"
                  value={requisites.bic}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, bic: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Корр. счёт *</span>
                <input
                  type="text"
                  value={requisites.corr}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, corr: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm font-semibold text-zinc-800">Адрес СНТ</span>
                <input
                  type="text"
                  value={requisites.address || ""}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, address: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Председатель (ФИО)</span>
                <input
                  type="text"
                  value={requisites.chairman || ""}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, chairman: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Телефон председателя</span>
                <input
                  type="text"
                  value={requisites.chairmanPhone || ""}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, chairmanPhone: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Email председателя</span>
                <input
                  type="email"
                  value={requisites.chairmanEmail || ""}
                  onChange={(e) => setRequisites((prev) => ({ ...prev, chairmanEmail: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Сохраняем..." : "Сохранить реквизиты"}
            </button>
          </form>
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Контакты</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveContacts();
            }}
            className="space-y-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Телефон</span>
              <input
                type="text"
                value={contacts.phone || ""}
                onChange={(e) => setContacts((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Email</span>
              <input
                type="email"
                value={contacts.email || ""}
                onChange={(e) => setContacts((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Адрес</span>
              <input
                type="text"
                value={contacts.address || ""}
                onChange={(e) => setContacts((prev) => ({ ...prev, address: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Сохраняем..." : "Сохранить контакты"}
            </button>
          </form>
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === "channels" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Официальные каналы связи</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveChannels();
            }}
            className="space-y-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">VK (ссылка)</span>
              <input
                type="url"
                value={channels.vk}
                onChange={(e) => setChannels((prev) => ({ ...prev, vk: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder="https://vk.com/..."
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Telegram (ссылка)</span>
              <input
                type="url"
                value={channels.telegram}
                onChange={(e) => setChannels((prev) => ({ ...prev, telegram: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder="https://t.me/..."
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Email</span>
              <input
                type="email"
                value={channels.email}
                onChange={(e) => setChannels((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-zinc-800">Телефон</span>
              <input
                type="text"
                value={channels.phone}
                onChange={(e) => setChannels((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Сохраняем..." : "Сохранить каналы"}
            </button>
          </form>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === "schedule" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Расписание работы</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveSchedule();
            }}
            className="space-y-4"
          >
            <div className="space-y-3">
              {schedule.items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <label className="flex-1 flex flex-col gap-1">
                    <span className="text-sm font-semibold text-zinc-800">День недели</span>
                    <input
                      type="text"
                      value={item.day}
                      onChange={(e) => updateScheduleItem(index, "day", e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2"
                      placeholder="Понедельник"
                    />
                  </label>
                  <label className="flex-1 flex flex-col gap-1">
                    <span className="text-sm font-semibold text-zinc-800">Часы</span>
                    <input
                      type="text"
                      value={item.hours}
                      onChange={(e) => updateScheduleItem(index, "hours", e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2"
                      placeholder="9:00 - 18:00"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeScheduleItem(index)}
                    className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addScheduleItem}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              + Добавить день
            </button>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
              >
                {loading ? "Сохраняем..." : "Сохранить расписание"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === "pages" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Настройки публичных страниц</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSavePages();
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900">Главная страница</h3>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Заголовок</span>
                <input
                  type="text"
                  value={pages.homeTitle || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, homeTitle: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Описание</span>
                <textarea
                  value={pages.homeDescription || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, homeDescription: e.target.value }))}
                  rows={3}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900">О портале</h3>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Заголовок</span>
                <input
                  type="text"
                  value={pages.aboutTitle || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, aboutTitle: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Описание</span>
                <textarea
                  value={pages.aboutDescription || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, aboutDescription: e.target.value }))}
                  rows={3}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900">Помощь</h3>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Заголовок</span>
                <input
                  type="text"
                  value={pages.helpTitle || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, helpTitle: e.target.value }))}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-800">Описание</span>
                <textarea
                  value={pages.helpDescription || ""}
                  onChange={(e) => setPages((prev) => ({ ...prev, helpDescription: e.target.value }))}
                  rows={3}
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50"
            >
              {loading ? "Сохраняем..." : "Сохранить настройки страниц"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
