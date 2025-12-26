"use client";

import { useState } from "react";

type MembershipBlockProps = {
  latestRequest: {
    plots?: Array<{ plotNumber: string; cadastral?: string | null }>;
    status?: "new" | "approved" | "rejected" | "needs_info";
    comment?: string | null;
    plotId?: string;
  } | null;
  onSubmit: (formData: FormData) => void;
  onProposal?: (formData: FormData) => void;
};

type Basis = "OWNER" | "INHERITANCE" | "REPRESENTATIVE";

const basisLabels: Record<Basis, string> = {
  OWNER: "Собственник",
  INHERITANCE: "Наследство",
  REPRESENTATIVE: "Представитель",
};

export function MembershipBlock({ latestRequest, onSubmit, onProposal }: MembershipBlockProps) {
  const [fields, setFields] = useState<string[]>(
    latestRequest?.plots?.map((p) => p.cadastral || p.plotNumber).filter(Boolean) ?? [""],
  );
  const [basis, setBasis] = useState<Basis>(
    (latestRequest?.comment?.replace("Основание: ", "").toUpperCase() as Basis) || "OWNER",
  );

  const addField = () => setFields((prev) => [...prev, ""]);
  const updateField = (idx: number, value: string) =>
    setFields((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const removeField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const status = latestRequest?.status;
  const isPending = status === "new";
  const needsInfo = status === "needs_info";

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Подтверждение членства</div>
          <p className="text-xs text-zinc-600">Кадастровые номера и основание владения.</p>
        </div>
        {status === "approved" && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Подтверждено
          </span>
        )}
        {isPending && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
            На проверке
          </span>
        )}
        {needsInfo && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
            Нужны уточнения
          </span>
        )}
      </div>

      {status === "approved" ? (
        <p className="text-xs text-zinc-700">Статус подтверждён правлением.</p>
      ) : needsInfo ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Нужны уточнения.
            {latestRequest?.comment ? <div className="mt-1 text-amber-900">Комментарий: {latestRequest.comment}</div> : null}
          </div>
          <form
            action={onProposal ?? onSubmit}
            className="space-y-3"
            onSubmit={(e) => {
              const nonEmpty = fields.filter((f) => f.trim() !== "");
              if (nonEmpty.length === 0) {
                e.preventDefault();
              }
            }}
          >
            {latestRequest?.plotId ? <input type="hidden" name="plotId" value={latestRequest.plotId} /> : null}
            <MembershipFields
              fields={fields}
              basis={basis}
              onAdd={addField}
              onUpdate={updateField}
              onRemove={removeField}
              onBasisChange={setBasis}
            />
            <button
              type="submit"
              className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
            >
              Исправить заявку
            </button>
          </form>
        </div>
      ) : (
        <form
          action={onProposal ?? onSubmit}
          className="space-y-3"
          onSubmit={(e) => {
            const nonEmpty = fields.filter((f) => f.trim() !== "");
            if (nonEmpty.length === 0) {
              e.preventDefault();
            }
          }}
        >
          {latestRequest?.plotId ? <input type="hidden" name="plotId" value={latestRequest.plotId} /> : null}
          <MembershipFields
            fields={fields}
            basis={basis}
            onAdd={addField}
            onUpdate={updateField}
            onRemove={removeField}
            onBasisChange={setBasis}
          />

          <button
            type="submit"
            className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
          >
            {isPending ? "Изменить заявку" : "Отправить на проверку"}
          </button>
        </form>
      )}
    </div>
  );
}

type MembershipFieldsProps = {
  fields: string[];
  basis: Basis;
  onAdd: () => void;
  onUpdate: (idx: number, value: string) => void;
  onRemove: (idx: number) => void;
  onBasisChange: (basis: Basis) => void;
};

function MembershipFields({ fields, basis, onAdd, onUpdate, onRemove, onBasisChange }: MembershipFieldsProps) {
  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="mb-2 text-xs font-semibold text-zinc-700">Кадастровые номера участков</div>
        <div className="space-y-2">
          {fields.map((value, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                name="cadastralNumbers"
                value={value}
                onChange={(e) => onUpdate(idx, e.target.value)}
                placeholder="Кадастровый номер"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-dashed border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
          >
            + Добавить участок
          </button>
        </div>
      </div>

      <label className="text-xs text-zinc-700">
        Основание владения
        <select
          name="ownershipBasis"
          value={basis}
          onChange={(e) => onBasisChange(e.target.value as Basis)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {Object.entries(basisLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
