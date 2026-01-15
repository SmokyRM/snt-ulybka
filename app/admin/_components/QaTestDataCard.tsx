"use client";

import { useState } from "react";
import { qaText } from "@/lib/qaText";
import QaCopyButton from "./QaCopyButton";

type Role = "resident" | "chairman" | "secretary" | "accountant" | "admin";

type TestDataItem = {
  login: string;
  password: string | null; // null если пароль недоступен
  comment: string;
  passwordEnvVar?: string; // название env переменной для отображения
};

type QaTestDataCardProps = {
  roles: Array<{ value: Role; label: string }>;
  testData: Record<Role, TestDataItem>;
  canShowPasswords: boolean; // true только если dev + ENABLE_QA + admin
};

export default function QaTestDataCard({ roles, testData, canShowPasswords }: QaTestDataCardProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<Role, boolean>>({
    resident: false,
    chairman: false,
    secretary: false,
    accountant: false,
    admin: false,
  });

  const togglePassword = (role: Role) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const getPasswordDisplay = (role: Role): string => {
    const item = testData[role];
    if (!canShowPasswords || item.password === null) {
      return "••••••••";
    }
    return visiblePasswords[role] ? item.password : "••••••••";
  };

  const getPasswordValue = (role: Role): string | null => {
    if (!canShowPasswords || testData[role].password === null) {
      return null;
    }
    return testData[role].password;
  };


  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">{qaText.headers.testData}</h2>
      <p className="mb-4 text-sm text-zinc-600">{qaText.misc.testDataDescription}</p>
      <div className="space-y-4">
        {roles.map((role) => {
          const data = testData[role.value];
          const passwordValue = getPasswordValue(role.value);
          const passwordDisplay = getPasswordDisplay(role.value);

          return (
            <div key={role.value} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900">{role.label}</h3>
              </div>
              <div className="space-y-2 text-sm">
                {/* Логин */}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-700">{qaText.labels.login}:</span>
                  <code className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900">
                    {data.login}
                  </code>
                  <QaCopyButton
                    value={data.login}
                    testId={`qa-copy-${role.value}-login`}
                    label={`${qaText.labels.login} для ${role.label}`}
                  />
                </div>

                {/* Пароль */}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-700">{qaText.labels.password}:</span>
                  {!canShowPasswords || data.password === null ? (
                    <>
                      <code className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900">
                        {data.passwordEnvVar
                          ? `Пароль не задан (env ${data.passwordEnvVar})`
                          : "Скрыто"}
                      </code>
                    </>
                  ) : (
                    <>
                      <code
                        className="rounded bg-white px-2 py-1 font-mono text-xs text-zinc-900"
                        data-testid={`qa-testdata-pass-value-${role.value}`}
                      >
                        {passwordDisplay}
                      </code>
                      <button
                        type="button"
                        onClick={() => togglePassword(role.value)}
                        data-testid={`qa-testdata-pass-toggle-${role.value}`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
                        aria-label={visiblePasswords[role.value] ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {visiblePasswords[role.value] ? "Скрыть" : "Показать"}
                      </button>
                      {passwordValue !== null && (
                        <QaCopyButton
                          value={passwordValue}
                          testId={`qa-testdata-pass-copy-${role.value}`}
                          label={`${qaText.labels.password} для ${role.label}`}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Комментарий */}
                <div className="mt-2 text-xs text-zinc-600">{data.comment}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
