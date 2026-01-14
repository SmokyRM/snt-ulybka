import StaffLoginForm from "./StaffLoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff-login" },
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const rawNext = typeof params.next === "string" ? params.next : null;
  const nextParam = rawNext && rawNext.startsWith("/") ? rawNext : "/office";

  return <StaffLoginForm next={nextParam} />;
}
