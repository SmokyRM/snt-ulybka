import { redirect } from "next/navigation";
import RegisterClient from "./RegisterClient";
import { validateInviteCode } from "@/lib/registry/core/inviteCodes.store";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const code = typeof params.code === "string" ? params.code : null;

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-zinc-900">Регистрация</h1>
          <p className="text-sm text-zinc-600">Для регистрации необходим код приглашения.</p>
        </div>
      </div>
    );
  }

  // Validate code
  const validation = validateInviteCode(code);
  if (!validation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-red-900">Код недействителен</h1>
          <p className="text-sm text-red-700">
            {validation.reason === "not_found"
              ? "Код приглашения не найден."
              : validation.reason === "already_used"
                ? "Код приглашения уже был использован."
                : "Код приглашения недействителен."}
          </p>
        </div>
      </div>
    );
  }

  return <RegisterClient code={code} personId={validation.inviteCode!.personId} />;
}
