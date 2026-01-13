"use client";

import { useFormState } from "react-dom";
import { submitLinkPlotAction, type LinkPlotState } from "./actions";
import type { PlotMasterItem } from "@/lib/plotsMaster.store";
import type { SessionUser } from "@/lib/session.server";

type Props = {
  user: SessionUser;
  plots: PlotMasterItem[];
};

const initialState: LinkPlotState = { ok: true, error: null };

export function LinkPlotForm({ user, plots }: Props) {
  const [state, formAction] = useFormState(submitLinkPlotAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {state.error ? (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
          data-testid="cabinet-link-plot-error"
        >
          {state.error}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">ФИО</div>
          <input
            name="fio"
            defaultValue={user.fullName ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Иван Иванов"
          />
        </label>
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Телефон</div>
          <input
            name="phone"
            defaultValue={user.phone ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="+7 ..."
          />
        </label>
      </div>
      <label className="text-sm text-zinc-700">
        <div className="text-xs font-semibold text-zinc-600">Адрес (опционально)</div>
        <input
          name="address"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          placeholder="Улица, дом"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Улица</div>
          <select
            name="streetNo"
            data-testid="cabinet-link-plot-street"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            {Array.from({ length: 27 }).map((_, idx) => (
              <option key={idx} value={idx + 1}>
                Улица {idx + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <div className="text-xs font-semibold text-zinc-600">Участок</div>
          <input
            name="plotLabel"
            data-testid="cabinet-link-plot-plot"
            defaultValue={plots[0]?.plotLabel ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="Например: 12"
          />
        </label>
      </div>
      <button
        type="submit"
        data-testid="cabinet-link-plot-submit"
        className="w-full rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
      >
        Отправить запрос
      </button>
      <div className="text-xs text-zinc-500">Правление проверит участок по мастер-списку и подтвердит доступ.</div>
    </form>
  );
}
