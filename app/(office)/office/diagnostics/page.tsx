import { requirePermission } from "@/lib/authGuard";
import DiagnosticsClient from "./DiagnosticsClient";

export default async function OfficeDiagnosticsPage() {
  await requirePermission("diagnostics.view", {
    kind: "staff",
    nextPath: "/office/diagnostics",
    forbiddenReason: "diagnostics.view",
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Состояние системы</h1>
        <p className="text-sm text-zinc-500">
          Проверка БД, таблиц и статуса фоновых задач.
        </p>
      </div>
      <DiagnosticsClient />
    </section>
  );
}
