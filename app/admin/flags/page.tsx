import { requirePermission } from "@/lib/authGuard";
import { listFlags } from "@/lib/config/flags";

export default async function AdminFlagsPage() {
  await requirePermission("admin.access", {
    kind: "staff",
    nextPath: "/admin/flags",
    forbiddenReason: "admin.only",
  });

  const flags = listFlags();

  return (
    <section className="space-y-4" data-testid="admin-flags-root">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Feature Flags</h1>
        <p className="text-sm text-zinc-600">
          Флаги читаются только из переменных окружения. Редактирование через UI отключено.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Флаг</th>
              <th className="px-4 py-3">Значение</th>
              <th className="px-4 py-3">Источник</th>
              <th className="px-4 py-3">Env</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {flags.map((flag) => (
              <tr key={flag.key}>
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{flag.key}</div>
                  <div className="text-xs text-zinc-500">{flag.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      flag.enabled ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {flag.enabled ? "ON" : "OFF"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-700">{flag.source}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{flag.env}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
