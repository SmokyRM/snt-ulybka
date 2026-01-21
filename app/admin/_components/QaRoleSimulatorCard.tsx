"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { primaryButtonClass, secondaryButtonClass } from "./qaStyles";
import { useToast } from "./QaReportUtils";
import { apiGet, apiPost } from "@/lib/api/client";

type ImpersonateRole = "guest" | "resident" | "chairman" | "secretary" | "accountant" | "admin";

const ROLES: Array<{ value: ImpersonateRole; label: string }> = [
  { value: "guest", label: "Гость" },
  { value: "resident", label: "Житель" },
  { value: "chairman", label: "Председатель" },
  { value: "secretary", label: "Секретарь" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "admin", label: "Админ" },
];

const PRESET_ROUTES = [
  { value: "/", label: "Главная" },
  { value: "/cabinet", label: "Кабинет" },
  { value: "/office", label: "Офис" },
  { value: "/admin", label: "Админ" },
];

export default function QaRoleSimulatorCard() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [selectedRole, setSelectedRole] = useState<ImpersonateRole>("resident");
  const [selectedNext, setSelectedNext] = useState<string>("/cabinet");
  const [customNext, setCustomNext] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<string | null>(null);

  // Load current role info (memoized to avoid infinite loops)
  useEffect(() => {
    let mounted = true;
    const loadRoleInfo = async () => {
      try {
        // Try to get role from /api/me or similar
        const data = await apiGet<{ user?: { role?: string } }>("/api/me", { credentials: "include" });
        if (mounted && data.user?.role) {
          setCurrentRole(data.user.role);
        }
      } catch {
        // Ignore errors
      }
    };
    loadRoleInfo();
    return () => {
      mounted = false;
    };
  }, []); // Empty deps: only run on mount

  const handleImpersonate = useCallback(async () => {
    const next = customNext.trim() || selectedNext;
    if (!next.startsWith("/")) {
      showToast("Некорректный путь (должен начинаться с /)");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost<{ next?: string }>("/api/admin/qa/impersonate", { role: selectedRole, next }, { credentials: "include" });
      showToast(`Роль переключена: ${selectedRole}`);
      
      // Navigate to next route
      router.push(data.next || next);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка при переключении роли");
      setLoading(false);
    }
  }, [selectedRole, selectedNext, customNext, router, showToast]);

  const handleResetSession = useCallback(async () => {
    setLoading(true);
    try {
      await apiPost("/api/admin/qa/reset-session", undefined, { credentials: "include" });

      showToast("Сессия сброшена");
      setCurrentRole(null);
      setEffectiveRole(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ошибка при сбросе сессии");
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  const handleQuickAction = useCallback(
    async (role: ImpersonateRole, next: string) => {
      const targetNext = next;
      const targetRole = role;
      
      if (!targetNext.startsWith("/")) {
        showToast("Некорректный путь (должен начинаться с /)");
        return;
      }

      setLoading(true);
      try {
        const data = await apiPost<{ next?: string }>(
          "/api/admin/qa/impersonate",
          { role: targetRole, next: targetNext },
          { credentials: "include" }
        );
        showToast(`Роль переключена: ${targetRole}`);
        
        // Navigate to next route
        router.push(data.next || targetNext);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Ошибка при переключении роли");
        setLoading(false);
      }
    },
    [router, showToast]
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" data-testid="qa-role-simulator-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Role Simulator</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Быстрое переключение ролей для тестирования без ввода паролей
        </p>
      </div>

      {(currentRole || effectiveRole) && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div className="font-medium text-zinc-700">Текущая сессия:</div>
          <div className="mt-1 text-zinc-600">
            {currentRole && <span>Роль: {currentRole}</span>}
            {effectiveRole && currentRole !== effectiveRole && (
              <span className="ml-2">→ Эффективная: {effectiveRole}</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Роль</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedRole === role.value
                    ? "bg-[#5E704F] text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:border-[#5E704F] hover:bg-[#5E704F]/5"
                }`}
                data-testid={`qa-role-simulator-role-${role.value}`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Куда перейти</label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {PRESET_ROUTES.map((route) => (
                <button
                  key={route.value}
                  type="button"
                  onClick={() => {
                    setSelectedNext(route.value);
                    setCustomNext("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedNext === route.value && !customNext
                      ? "bg-[#5E704F] text-white"
                      : "border border-zinc-300 bg-white text-zinc-700 hover:border-[#5E704F] hover:bg-[#5E704F]/5"
                  }`}
                  data-testid={`qa-role-simulator-route-${route.value.replace(/\//g, "_") || "root"}`}
                >
                  {route.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customNext}
              onChange={(e) => {
                setCustomNext(e.target.value);
                if (e.target.value.trim()) setSelectedNext("");
              }}
              placeholder="Или введите свой путь (например, /office/appeals)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
              data-testid="qa-role-simulator-custom-next"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleImpersonate}
            disabled={loading}
            className={primaryButtonClass}
            data-testid="qa-role-simulator-impersonate-btn"
          >
            {loading ? "Переключение..." : "Переключить роль и открыть"}
          </button>
          <button
            type="button"
            onClick={handleResetSession}
            disabled={loading}
            className={secondaryButtonClass}
            data-testid="qa-role-simulator-reset-btn"
          >
            Сбросить сессию
          </button>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 text-sm font-medium text-zinc-700">Быстрые действия:</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickAction("resident", "/cabinet")}
              disabled={loading}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 disabled:opacity-50"
              data-testid="qa-role-simulator-quick-resident-cabinet"
            >
              Войти как житель → /cabinet
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction("chairman", "/office")}
              disabled={loading}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 disabled:opacity-50"
              data-testid="qa-role-simulator-quick-chairman-office"
            >
              Войти как председатель → /office
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction("admin", "/admin")}
              disabled={loading}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 disabled:opacity-50"
              data-testid="qa-role-simulator-quick-admin-admin"
            >
              Войти как админ → /admin
            </button>
          </div>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
