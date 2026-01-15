import { Suspense } from "react";
import StaffLoginClient from "./StaffLoginClient";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff/login" },
};

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        </div>
        <p className="text-sm text-zinc-600">Загрузка...</p>
      </main>
    }>
      <StaffLoginClient />
    </Suspense>
  );
}
