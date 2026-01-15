"use client";

import { useFormStatus } from "react-dom";

export function SubmitElectricityButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Отправка..." : "Отправить"}
    </button>
  );
}

export function SubmitAppealButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Отправка..." : "Отправить"}
    </button>
  );
}

export function MarkEventButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Обработка..." : "Отметить прочитанным"}
    </button>
  );
}

export function MarkAllEventsButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Обработка..." : "Отметить всё прочитанным"}
    </button>
  );
}

export function AckDocButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Обработка..." : "Я ознакомлен(а)"}
    </button>
  );
}
