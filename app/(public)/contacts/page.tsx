import Contacts from "@/components/home/Contacts";

export const metadata = {
  alternates: {
    canonical: "/contacts",
  },
};

export default function ContactsPage() {
  return (
    <main className="bg-[#F8F1E9]">
      <div className="pt-6 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h1 className="text-3xl font-semibold text-zinc-900">Контакты</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Официальные контакты правления и реквизиты СНТ «Улыбка».
          </p>
        </div>
      </div>
      <Contacts />
    </main>
  );
}
