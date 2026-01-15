import DocumentsClient from "./DocumentsClient";
import { listDocuments, type DocumentRecord } from "@/lib/documentsStore";
import { getSessionUser } from "@/lib/session.server";
import { getOnboardingStatus } from "@/lib/onboardingStatus";
import OnboardingBlock from "@/components/OnboardingBlock";

// Кешируем статичные данные для public страницы
// Убрали force-dynamic для оптимизации TTFB
export const revalidate = 300; // 5 минут

export const metadata = {
  alternates: {
    canonical: "/docs",
  },
};

const normalizeRole = (
  role?: string | null,
): "guest" | "user" | "board" | "admin" | "chair" => {
  if (role === "admin") return "admin";
  if (role === "board") return "board";
  if (role === "chair") return "chair";
  if (role === "user") return "user";
  return "guest";
};

const hasAccess = (doc: DocumentRecord, role: ReturnType<typeof normalizeRole>) => {
  if (role === "admin") return true;
  if (role === "board" || role === "chair") {
    return doc.audience.some((a) => ["board", "chair", "user", "guest"].includes(a));
  }
  if (role === "user") {
    return doc.audience.some((a) => ["user", "guest"].includes(a));
  }
  return doc.audience.includes("guest");
};

export default async function DocsPage() {
  const user = await getSessionUser();
  if (user && user.role !== "admin") {
    const status = await getOnboardingStatus(user.id ?? "");
    if (status !== "complete") {
      return <OnboardingBlock />;
    }
  }
  const role = normalizeRole(user?.role);
  const allDocuments = await listDocuments();
  const documents = allDocuments.filter((doc) => doc.published && hasAccess(doc, role));
  const isGuest = role === "guest";
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Документы СНТ «Улыбка»</h1>
          <p className="text-sm text-zinc-700">
            Официальные документы товарищества, протоколы собраний и шаблоны заявлений.
          </p>
        </div>
        <DocumentsClient documents={documents} isGuest={isGuest} />
      </div>
    </main>
  );
}
