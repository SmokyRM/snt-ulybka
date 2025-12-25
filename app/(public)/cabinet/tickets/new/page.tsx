import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import NewTicketForm from "./NewTicketForm";

export default async function NewTicketPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Новое обращение</h1>
        <NewTicketForm />
      </div>
    </main>
  );
}

