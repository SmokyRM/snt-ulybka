import StaffLoginForm from "./StaffLoginForm";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff-login" },
};

export default function StaffLoginPage() {
  return <StaffLoginForm />;
}
