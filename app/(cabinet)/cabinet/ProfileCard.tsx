"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  profile: { fullName: string | null; phone: string | null; email: string | null };
  action: (formData: FormData) => void;
  autoEdit?: boolean;
};

export function ProfileCard({ profile, action, autoEdit = false }: Props) {
  const [editing, setEditing] = useState(autoEdit);
  const fullNameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      fullNameRef.current?.focus();
    }
  }, [editing]);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" id="profile">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Мой профиль</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
          >
            Изменить
          </button>
        )}
      </div>

      {!editing && (
        <div className="mt-3 grid gap-3 text-sm text-zinc-800 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">ФИО</div>
            <div>{profile.fullName || "Не указано"}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Телефон</div>
            <div>{profile.phone || "Не указано"}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="font-semibold text-zinc-900">Email</div>
            <div>{profile.email || "Не указано"}</div>
          </div>
        </div>
      )}

      {editing && (
        <form
          action={async (formData) => {
            await action(formData);
            setEditing(false);
          }}
          className="mt-3 grid gap-2 text-sm sm:grid-cols-2"
        >
          <input
            name="fullName"
            defaultValue={profile.fullName ?? ""}
            placeholder="ФИО"
            required
            ref={fullNameRef}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
          <input
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="Телефон"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
