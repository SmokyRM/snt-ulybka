"use client";

import { useRouter } from "next/navigation";

type Filters = {
  confirmed?: boolean;
  membership?: string | null;
  missingContacts?: boolean;
  q?: string | null;
};

export default function FiltersClient({ initialFilters }: { initialFilters: Filters }) {
  const router = useRouter();

  const buildQuery = (data: Filters) => {
    const params = new URLSearchParams();
    if (data.confirmed === true) params.set("confirmed", "1");
    if (data.confirmed === false) params.set("confirmed", "0");
    if (data.membership) params.set("membership", data.membership);
    if (data.missingContacts) params.set("missingContacts", "1");
    if (data.q) params.set("q", data.q);
    return params.toString();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nextFilters: Filters = {
      confirmed: formData.get("confirmed") === "1" ? true : formData.get("confirmed") === "0" ? false : undefined,
      membership: (formData.get("membership") as string) || null,
      missingContacts: formData.get("missingContacts") === "1",
      q: (formData.get("q") as string) || null,
    };
    const query = buildQuery(nextFilters);
    router.push(`/admin/plots${query ? `?${query}` : ""}`);
  };

  const reset = () => {
    router.push("/admin/plots");
  };

  return (
    <form
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-700">Подтверждён</label>
        <select
          name="confirmed"
          defaultValue={initialFilters.confirmed === undefined ? "" : initialFilters.confirmed ? "1" : "0"}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все</option>
          <option value="1">Да</option>
          <option value="0">Нет</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-zinc-700">Статус членства</label>
        <select
          name="membership"
          defaultValue={initialFilters.membership ?? ""}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Все</option>
          <option value="UNKNOWN">Не определён</option>
          <option value="MEMBER">Член</option>
          <option value="NON_MEMBER">Не член</option>
        </select>
      </div>
      <div className="flex flex-col justify-end">
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <input
            type="checkbox"
            name="missingContacts"
            value="1"
            defaultChecked={initialFilters.missingContacts}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Нет контактов
        </label>
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
        <label className="text-xs font-semibold text-zinc-700">Поиск</label>
        <input
          type="text"
          name="q"
          defaultValue={initialFilters.q ?? ""}
          placeholder="Улица, номер или ФИО"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
        <button
          type="submit"
          className="w-full rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Применить
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
        >
          Сбросить
        </button>
      </div>
    </form>
  );
}
