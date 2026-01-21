import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, getEffectiveSessionUser } from "@/lib/session.server";
import { qaEnabled } from "@/lib/qaScenario";
import { qaText } from "@/lib/qaText";
import QaStatusCard from "../_components/QaStatusCard";
import QaChecksCard from "../_components/QaChecksCard";
import QaDebugActionsWrapper from "../_components/QaDebugActionsWrapper";
import QaSeedCard from "../_components/QaSeedCard";
import QaMatrixCard from "../_components/QaMatrixCard";
import QaDeadendsCard from "../_components/QaDeadendsCard";
import QaBugReportBuilder from "../_components/QaBugReportBuilder";
import QaBugReportCard from "../_components/QaBugReportCard";
import QaTestPlanCard from "../_components/QaTestPlanCard";
import QaTestRunCard from "../_components/QaTestRunCard";
import QaComboReport from "../_components/QaComboReport";
import QaTestDataCard from "../_components/QaTestDataCard";
import QaSnapshotCard from "../_components/QaSnapshotCard";
import QaTicketBuilder from "../_components/QaTicketBuilder";
import QaStateBar from "../_components/QaStateBar";
import QaQualityCenterCard from "../_components/QaQualityCenterCard";
import QaRoleSimulatorCard from "../_components/QaRoleSimulatorCard";
import { readOnboardingStateFromCookies } from "../cabinet-lab/../../cabinet/_components/onboardingState";
import { getQaCabinetStageFromCookies, readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { QaCabinetControl } from "../_components/QaCabinetControl";
import QaCabinetLabButton from "../_components/QaCabinetLabButton";

export const metadata = {
  title: "Пульт тестировщика — СНТ «Улыбка»",
  alternates: { canonical: "/admin/qa" },
};

type Role = "resident" | "chairman" | "secretary" | "accountant" | "admin";
type NextPath = "/cabinet" | "/office" | "/admin";

const ROLES: Array<{ value: Role; label: string; loginType: "code" | "staff" }> = [
  { value: "resident", label: qaText.roles.resident, loginType: "code" },
  { value: "chairman", label: qaText.roles.chairman, loginType: "staff" },
  { value: "secretary", label: qaText.roles.secretary, loginType: "staff" },
  { value: "accountant", label: qaText.roles.accountant, loginType: "staff" },
  { value: "admin", label: qaText.roles.admin, loginType: "code" },
];

const NEXT_PATHS: Array<{ value: NextPath; label: string }> = [
  { value: "/cabinet", label: qaText.paths.cabinet },
  { value: "/office", label: qaText.paths.office },
  { value: "/admin", label: qaText.paths.admin },
];

// Базовые данные для тест-данных (логины и комментарии)
const TEST_DATA_BASE: Record<Role, { login: string; comment: string }> = {
  resident: {
    login: "1111",
    comment: qaText.testDataComments.resident,
  },
  chairman: {
    login: "председатель",
    comment: qaText.testDataComments.chairman,
  },
  secretary: {
    login: "секретарь",
    comment: qaText.testDataComments.secretary,
  },
  accountant: {
    login: "бухгалтер",
    comment: qaText.testDataComments.accountant,
  },
  admin: {
    login: "1233",
    comment: qaText.testDataComments.admin,
  },
};

const QUICK_LINKS = [
  { href: "/login", label: qaText.quickLinks.login },
  { href: "/staff-login", label: qaText.quickLinks.staffLogin },
  { href: "/cabinet", label: qaText.quickLinks.cabinet },
  { href: "/office", label: qaText.quickLinks.office },
  { href: "/admin", label: qaText.quickLinks.admin },
  { href: "/forbidden", label: qaText.quickLinks.forbidden },
];

export default async function QaPage() {
  // Защита от production: если NODE_ENV==="production" и ENABLE_QA!="true" — показываем 404
  if (!qaEnabled()) {
    notFound();
  }

  const session = await getSessionUser();
  const isDev = process.env.NODE_ENV !== "production";
  const masterCodeConfigured = Boolean((process.env.DEV_LOGIN_CODE || process.env.MASTER_CODE)?.trim());
  if (!session || (session.role !== "admin" && session.role !== "board")) {
    if (isDev) {
      // В dev ослабляем доступ для удобства тестов QA
    } else {
      redirect("/staff/login?next=/admin/qa");
    }
  }

  const effectiveSession = await getEffectiveSessionUser();

  // Безопасное получение паролей из env (только dev + ENABLE_QA + admin)
  const canShowPasswords =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_QA === "true" &&
    session?.role === "admin";

  // Получаем пароли из env переменных
  const getPasswordForRole = (role: Role): string | null => {
    if (!canShowPasswords) {
      return null;
    }

    switch (role) {
      case "chairman":
        return process.env.AUTH_PASS_CHAIRMAN || null;
      case "secretary":
        return process.env.AUTH_PASS_SECRETARY || null;
      case "accountant":
        return process.env.AUTH_PASS_ACCOUNTANT || null;
      case "resident":
        // Можно использовать env или оставить дефолтное значение
        return process.env.AUTH_PASS_RESIDENT || "1111";
      case "admin":
        // Можно использовать env или оставить дефолтное значение
        return process.env.AUTH_PASS_ADMIN || "1233";
      default:
        return null;
    }
  };

  // Формируем данные для тест-данных
  const testData: Record<
    Role,
    {
      login: string;
      password: string | null;
      comment: string;
      passwordEnvVar?: string;
    }
  > = {
    resident: {
      ...TEST_DATA_BASE.resident,
      password: getPasswordForRole("resident"),
      passwordEnvVar: "AUTH_PASS_RESIDENT",
    },
    chairman: {
      ...TEST_DATA_BASE.chairman,
      password: getPasswordForRole("chairman"),
      passwordEnvVar: "AUTH_PASS_CHAIRMAN",
    },
    secretary: {
      ...TEST_DATA_BASE.secretary,
      password: getPasswordForRole("secretary"),
      passwordEnvVar: "AUTH_PASS_SECRETARY",
    },
    accountant: {
      ...TEST_DATA_BASE.accountant,
      password: getPasswordForRole("accountant"),
      passwordEnvVar: "AUTH_PASS_ACCOUNTANT",
    },
    admin: {
      ...TEST_DATA_BASE.admin,
      password: getPasswordForRole("admin"),
      passwordEnvVar: "AUTH_PASS_ADMIN",
    },
  };

  const qaStage = await getQaCabinetStageFromCookies();
  const onboardingState = await readOnboardingStateFromCookies();
  const mockEnabled = await readQaCabinetMockEnabled();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6" data-testid="qa-root">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">QA</p>
          <h1 className="text-2xl font-semibold">{qaText.headers.pageTitle}</h1>
          <p className="text-sm text-zinc-700">{qaText.misc.pageDescription}</p>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-sm">
            <QaDebugActionsWrapper
              envInfo={{
                NODE_ENV: process.env.NODE_ENV,
                ENABLE_QA: process.env.ENABLE_QA,
                NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
                GIT_SHA: process.env.GIT_SHA,
              }}
              sessionSnapshot={{
                role: effectiveSession?.role,
                userId: effectiveSession?.id,
                fullName: effectiveSession?.fullName,
                email: effectiveSession?.email,
                phone: effectiveSession?.phone,
                isQaOverride: effectiveSession?.isQaOverride,
                qaScenario: effectiveSession?.qaScenario ?? null,
                realRole: effectiveSession?.realRole,
                isImpersonating: effectiveSession?.isImpersonating,
              }}
            />
            <QaBugReportBuilder
              envInfo={{
                NODE_ENV: process.env.NODE_ENV,
                ENABLE_QA: process.env.ENABLE_QA,
                NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
                GIT_SHA: process.env.GIT_SHA,
              }}
              sessionSnapshot={{
                role: effectiveSession?.role,
                userId: effectiveSession?.id,
                isQaOverride: effectiveSession?.isQaOverride,
              }}
            />
            <QaComboReport
              envInfo={{
                NODE_ENV: process.env.NODE_ENV,
                ENABLE_QA: process.env.ENABLE_QA,
                NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
                GIT_SHA: process.env.GIT_SHA,
              }}
              sessionSnapshot={{
                role: effectiveSession?.role,
                userId: effectiveSession?.id,
                isQaOverride: effectiveSession?.isQaOverride,
              }}
            />
            <QaCabinetLabButton />
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700">
                QA stage: {qaStage ?? "—"}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700">
                Onboarding: {onboardingState.step}
              </span>
              {isDev && (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700" title={masterCodeConfigured ? "DEV_LOGIN_CODE задан" : "Используется встроенный 1111"}>
                  Мастер-код: {masterCodeConfigured ? "включен" : "выключен"}
                </span>
              )}
            </div>
          </div>

          <QaCabinetControl
            initialStage={qaStage}
            mocksEnabled={mockEnabled}
            onboardingStep={onboardingState.step}
          />
        </header>

        {/* Панель состояния QA */}
        <QaStateBar
          enabled={process.env.NODE_ENV !== "production" && process.env.ENABLE_QA === "true"}
          envInfo={{
            NODE_ENV: process.env.NODE_ENV,
            ENABLE_QA: process.env.ENABLE_QA,
            NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
            GIT_SHA: process.env.GIT_SHA,
          }}
          sessionSnapshot={{
            role: effectiveSession?.role,
            userId: effectiveSession?.id,
            username: effectiveSession?.fullName,
            isQaOverride: effectiveSession?.isQaOverride,
          }}
        />

        {/* Инструкция тестировщику */}
        <details
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          data-testid="qa-tester-guide"
        >
          <summary className="cursor-pointer text-lg font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1 rounded p-1 -m-1">
            Инструкции тестировщику
          </summary>
          <div className="mt-4 space-y-4 text-sm text-zinc-700">
            <p>{qaText.misc.pageDescription}</p>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.quickLogin}</h3>
                <p className="text-zinc-600">{qaText.guide.quickLogin}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.quickLinks}</h3>
                <p className="text-zinc-600">{qaText.guide.quickLinks}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.status}</h3>
                <p className="text-zinc-600">{qaText.guide.status}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.checks}</h3>
                <p className="text-zinc-600">{qaText.guide.checks}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.testDataGenerator}</h3>
                <p className="text-zinc-600">{qaText.guide.seed}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.deadendScan}</h3>
                <p className="text-zinc-600">{qaText.guide.deadends}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{qaText.headers.accessMatrix}</h3>
                <p className="text-zinc-600">{qaText.guide.matrix}</p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Копирование отчёта</h3>
                <p className="text-zinc-600">{qaText.guide.report}</p>
              </div>
            </div>
          </div>
        </details>

        {/* Карточка: Статус */}
        <QaStatusCard />

        {/* Карточка: Быстрый вход */}
        <section
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          data-testid="qa-login-card"
        >
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">{qaText.headers.quickLogin}</h2>
          <p className="mb-4 text-xs text-zinc-500" data-testid="qa-help-login">
            {qaText.hints.quickLogin}
          </p>
          <p className="mb-4 text-sm text-zinc-600">{qaText.misc.selectRole}</p>
          <div className="space-y-4">
            {ROLES.map((role) => {
              const loginUrl = role.loginType === "code" ? "/login" : "/staff-login";
              return (
                <div key={role.value} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-800">{role.label}:</span>
                    <div className="flex flex-wrap gap-2">
                      {NEXT_PATHS.map((next) => {
                        // Для staff ролей только /office и /admin, для resident только /cabinet, для admin только /admin
                        const isAllowed =
                          (role.value === "resident" && next.value === "/cabinet") ||
                          (role.value === "admin" && next.value === "/admin") ||
                          (["chairman", "secretary", "accountant"].includes(role.value) &&
                            (next.value === "/office" || next.value === "/admin"));
                        if (!isAllowed) return null;

                        const href = `${loginUrl}?as=${role.value}&next=${encodeURIComponent(next.value)}`;
                        // Определяем дефолтный путь для роли
                        const defaultPath =
                          role.value === "resident"
                            ? "/cabinet"
                            : role.value === "admin"
                              ? "/admin"
                              : "/office";
                        const isDefault = next.value === defaultPath;
                        const nextSlug = next.value.replace("/", "") || "home";
                        const testId = isDefault
                          ? `qa-login-btn-${role.value}`
                          : `qa-login-btn-${role.value}-${nextSlug}`;
                        return (
                          <Link
                            key={next.value}
                            href={href}
                            data-testid={testId}
                            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
                            aria-label={`Войти как ${role.label} и перейти в ${next.label}`}
                          >
                            {role.label} → {next.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Карточка: Тест-данные */}
        <QaTestDataCard roles={ROLES} testData={testData} canShowPasswords={canShowPasswords} />

        {/* Карточка: Role Simulator */}
        <QaRoleSimulatorCard />

        {/* Карточка: Quality Center */}
        <QaQualityCenterCard />

        {/* Карточка: Проверки */}
        <QaChecksCard
          enableQa={process.env.ENABLE_QA === "true"}
          nodeEnv={process.env.NODE_ENV}
        />

        {/* Карточка: Access Matrix */}
        <QaMatrixCard
          enableQa={process.env.ENABLE_QA === "true"}
          nodeEnv={process.env.NODE_ENV}
        />

        {/* Карточка: Dead-end scan */}
        <QaDeadendsCard />

        {/* Карточка: Test data generator */}
        <QaSeedCard />

        {/* Карточка: Снимок среды */}
        <QaSnapshotCard
          envInfo={{
            NODE_ENV: process.env.NODE_ENV,
            ENABLE_QA: process.env.ENABLE_QA,
            NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
            GIT_SHA: process.env.GIT_SHA,
          }}
          sessionSnapshot={{
            role: effectiveSession?.role,
            userId: effectiveSession?.id,
            username: effectiveSession?.fullName,
            isQaOverride: effectiveSession?.isQaOverride,
          }}
        />

        {/* Карточка: Баг-репорт */}
        <QaBugReportCard
          envInfo={{
            NODE_ENV: process.env.NODE_ENV,
            ENABLE_QA: process.env.ENABLE_QA,
            NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
            GIT_SHA: process.env.GIT_SHA,
          }}
          sessionSnapshot={{
            role: effectiveSession?.role,
            userId: effectiveSession?.id,
            isQaOverride: effectiveSession?.isQaOverride,
          }}
        />

        {/* Карточка: Задача для трекера */}
        <QaTicketBuilder
          envInfo={{
            NODE_ENV: process.env.NODE_ENV,
            ENABLE_QA: process.env.ENABLE_QA,
            NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
            GIT_SHA: process.env.GIT_SHA,
          }}
          sessionSnapshot={{
            role: effectiveSession?.role,
            userId: effectiveSession?.id,
            isQaOverride: effectiveSession?.isQaOverride,
          }}
        />

        {/* Карточка: Сценарии тестирования */}
        <QaTestPlanCard />

        {/* Карточка: Отчёт прогона */}
        <QaTestRunCard
          envInfo={{
            NODE_ENV: process.env.NODE_ENV,
            ENABLE_QA: process.env.ENABLE_QA,
            NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
            GIT_SHA: process.env.GIT_SHA,
          }}
          sessionSnapshot={{
            role: effectiveSession?.role,
            userId: effectiveSession?.id,
            isQaOverride: effectiveSession?.isQaOverride,
          }}
        />

        {/* Карточка: Быстрые ссылки */}
        <section
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          data-testid="qa-links-card"
        >
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">{qaText.headers.quickLinks}</h2>
          <p className="mb-4 text-xs text-zinc-500" data-testid="qa-help-links">
            {qaText.hints.quickLinks}
          </p>
          <p className="mb-4 text-sm text-zinc-600">Прямые ссылки на основные страницы приложения.</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => {
              // КРИТИЧНО: Отключаем prefetch для /forbidden чтобы не вызывать лишние запросы
              const prefetchDisabled = link.href === "/forbidden";
              const slug = link.href.replace("/", "").replace("-", "-") || "home";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={prefetchDisabled ? false : undefined}
                  data-testid={`qa-link-${slug}`}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
                  aria-label={`Перейти на страницу: ${link.label}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
