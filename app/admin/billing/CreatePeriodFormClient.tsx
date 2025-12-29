"use client";

import { useFormState, useFormStatus } from "react-dom";

export type PeriodActionState = {
  status: "idle" | "success" | "warning" | "error";
  message: string;
};

type PeriodAction = (prevState: PeriodActionState, formData: FormData) => Promise<PeriodActionState>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Создание..." : "Создать период"}
    </button>
  );
}

export default function CreatePeriodFormClient({
  action,
  typeParam,
  defaultYear,
  defaultMonth,
}: {
  action: PeriodAction;
  typeParam: string;
  defaultYear: number;
  defaultMonth: number;
}) {
  const [state, formAction] = useFormState<PeriodActionState, FormData>(action, {
    status: "idle",
    message: "",
  });

  const messageStyle =
    state.status === "success"
      ? "text-emerald-700"
      : state.status === "warning"
        ? "text-amber-700"
        : state.status === "error"
          ? "text-rose-700"
          : "text-zinc-600";

  return (
    <form action={formAction} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Создать период</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-zinc-700">
          Год
          <input
            type="number"
            name="year"
            defaultValue={defaultYear}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Месяц
          <input
            type="number"
            name="month"
            defaultValue={defaultMonth}
            min={1}
            max={12}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <input type="hidden" name="type" value={typeParam} />
        {typeParam === "target_fee" && (
          <label className="text-sm text-zinc-700 sm:col-span-3">
            Заголовок (целевые)
            <input
              type="text"
              name="title"
              placeholder="Например, Дороги 2025"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        {state.status !== "idle" && state.message ? (
          <span className={`text-sm ${messageStyle}`}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
