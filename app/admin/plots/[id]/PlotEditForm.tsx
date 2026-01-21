"use client";

import { useState, FormEvent } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { MembershipStatus, Plot } from "@/types/snt";
import { ApiError, readRaw } from "@/lib/api/client";

const membershipOptions: MembershipStatus[] = ["UNKNOWN", "MEMBER", "NON_MEMBER"];

export default function PlotEditForm({ plot }: { plot: Plot }) {
  const router = useAppRouter();
  const [street, setStreet] = useState(plot.street);
  const [number, setNumber] = useState(plot.number);
  const [ownerFullName, setOwnerFullName] = useState(plot.ownerFullName ?? "");
  const [phone, setPhone] = useState(plot.phone ?? "");
  const [email, setEmail] = useState(plot.email ?? "");
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(
    plot.membershipStatus
  );
  const [isConfirmed, setIsConfirmed] = useState<boolean>(plot.isConfirmed);
  const [notes, setNotes] = useState(plot.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (street.trim().length < 2 || number.trim().length < 1) {
      setError("Укажите улицу и номер участка.");
      return;
    }
    setLoading(true);
    try {
      await readRaw(
        await fetch(`/api/plots/${plot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            street,
            number,
            ownerFullName: ownerFullName || null,
            phone: phone || null,
            email: email || null,
            membershipStatus,
            isConfirmed,
            notes: notes || null,
          }),
        })
      );
      setSuccess("Сохранено");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Не удалось сохранить");
        return;
      }
      setError("Ошибка сети, попробуйте позже");
    } finally {
      setLoading(false);
    }
  };

  const toggleConfirmed = async () => {
    setIsConfirmed((prev) => !prev);
    await handleSubmit(new Event("submit") as unknown as FormEvent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Улица</label>
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Номер участка</label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">ФИО владельца</label>
          <input
            value={ownerFullName}
            onChange={(e) => setOwnerFullName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Телефон</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Статус членства</label>
          <select
            value={membershipStatus}
            onChange={(e) => setMembershipStatus(e.target.value as MembershipStatus)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {membershipOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "UNKNOWN" ? "Не определён" : opt === "MEMBER" ? "Член" : "Не член"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isConfirmed"
          type="checkbox"
          checked={isConfirmed}
          onChange={(e) => setIsConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="isConfirmed" className="text-sm font-semibold text-zinc-800">
          Подтверждён
        </label>
        <button
          type="button"
          onClick={toggleConfirmed}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
        >
          {isConfirmed ? "Снять подтверждение" : "Подтвердить"}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Примечание</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-zinc-600">До 2000 символов.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Сохраняем..." : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
        >
          Назад
        </button>
      </div>
    </form>
  );
}
