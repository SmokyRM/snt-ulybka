"use client";

import RegistryImportClient from "./import/RegistryImportClient";

export default function RegistryImportTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Импорт реестра</h2>
          <p className="text-sm text-zinc-600">Загрузите CSV или XLSX файл с данными участков и владельцев</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>Поддерживается CSV с разделителем ; или , (UTF-8). Автоматическое определение формата v1/v2.</div>
          <a
            href="/api/admin/registry/import/template"
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Скачать шаблон CSV (v2)
          </a>
        </div>
      </div>

      <RegistryImportClient />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
        <h3 className="text-base font-semibold text-zinc-900">Как подготовить CSV</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Поддерживаются два формата (автоопределение по заголовкам):</li>
          <li className="ml-4">
            <strong>Формат v1:</strong> №, ФИО, Ул., Уч., Адрес, Тел.р
          </li>
          <li className="ml-4">
            <strong>Формат v2:</strong> Улица_СНТ_номер, Участок_номер, ФИО, Телефон, Email, Городской_адрес, Примечание
          </li>
          <li>Одна строка = один участок. Один человек может владеть несколькими участками.</li>
          <li>
            <strong>Улица/Улица_СНТ_номер</strong> — номер улицы/линии в СНТ (например: &quot;1&quot;, &quot;01&quot;, &quot;Улица 1&quot; →
            нормализуется в &quot;1&quot;)
          </li>
          <li>
            <strong>Адрес/Городской_адрес</strong> — городской (домашний) адрес человека (не используется для
            определения участка)
          </li>
          <li>Обязательные поля: ФИО, Номер улицы/линии, Номер участка</li>
        </ul>
      </section>
    </div>
  );
}
