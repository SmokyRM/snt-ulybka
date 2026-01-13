import StaffLoginForm from "./StaffLoginForm";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff-login" },
};

export default function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Безопасное извлечение next параметра
  const nextParam =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/office";

  return <StaffLoginForm next={nextParam} />;
}
