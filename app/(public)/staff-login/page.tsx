import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import StaffLoginClient from "./StaffLoginClient";
import { getSessionUser } from "@/lib/session.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff-login" },
};

async function getDiagnosticsData(requestUrl?: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const diagEnabled = process.env.STAFF_LOGIN_DIAG === "1";
  
  if (!isDev && !diagEnabled) {
    return null;
  }
  
  // Проверяем, является ли текущий пользователь admin (если есть сессия)
  const user = await getSessionUser().catch(() => null);
  const isAdmin = user?.role === "admin";
  
  if (!isAdmin && !diagEnabled) {
    return null;
  }
  
  const cookieStore = await Promise.resolve(cookies());
  const sessionCookie = cookieStore.get("snt_session");
  const hasSessionCookie = !!sessionCookie;
  
  return {
    hasSessionCookie,
    currentRole: user?.role || null,
    currentUrl: requestUrl || "",
  };
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await Promise.resolve(searchParams || {});
  const nextTarget = (params && "next" in params && typeof params.next === "string") ? params.next : null;
  
  // Получаем URL из headers
  const headersList = await Promise.resolve(headers());
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const pathname = "/staff-login";
  const search = nextTarget ? `?next=${encodeURIComponent(nextTarget)}` : "";
  const currentUrl = `${protocol}://${host}${pathname}${search}`;
  
  const diagnosticsData = await getDiagnosticsData(currentUrl);
  
  return (
    <Suspense fallback={
      <div data-testid="staff-login-suspense" className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        </div>
        <p className="text-sm text-zinc-600">Загрузка…</p>
      </div>
    }>
      <StaffLoginClient 
        diagnosticsData={diagnosticsData ? {
          currentUrl: diagnosticsData.currentUrl,
          nextTarget,
          hasSessionCookie: diagnosticsData.hasSessionCookie,
          currentRole: diagnosticsData.currentRole,
          lastLoginAttempt: null,
        } : null}
      />
    </Suspense>
  );
}
