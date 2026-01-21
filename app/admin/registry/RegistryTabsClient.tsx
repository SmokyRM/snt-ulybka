"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RegistryPeopleTab from "./RegistryPeopleTab";
import RegistryPlotsTab from "./RegistryPlotsTab";
import RegistryImportTab from "./RegistryImportTab";
import RegistryIssuesTab from "./RegistryIssuesTab";
import type { RegistryPerson } from "@/types/snt";

type Tab = "people" | "plots" | "import" | "issues";

interface EnrichedPerson extends RegistryPerson {
  plotsData: Array<{
    id: string;
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress?: string | null;
  }>;
}

interface RegistryTabsClientProps {
  initialTab: string;
  initialPersons: EnrichedPerson[];
  initialQuery?: string;
  initialVerificationStatus?: "not_verified" | "pending" | "verified" | "rejected";
}

export default function RegistryTabsClient({
  initialTab,
  initialPersons,
  initialQuery,
  initialVerificationStatus,
}: RegistryTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = useMemo(() => {
    const tab = tabParam || initialTab || "people";
    return (tab === "people" || tab === "plots" || tab === "import" || tab === "issues") ? tab : "people";
  }, [tabParam, initialTab]);

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "people") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/admin/registry?${params.toString()}`);
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "people", label: "Владельцы" },
    { id: "plots", label: "Участки" },
    { id: "import", label: "Импорт" },
    { id: "issues", label: "Проблемы" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#5E704F] text-[#5E704F]"
                  : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "people" && (
          <RegistryPeopleTab
            initialPersons={initialPersons}
            initialQuery={initialQuery}
            initialVerificationStatus={initialVerificationStatus}
          />
        )}
        {activeTab === "plots" && <RegistryPlotsTab />}
        {activeTab === "import" && <RegistryImportTab />}
        {activeTab === "issues" && <RegistryIssuesTab />}
      </div>
    </div>
  );
}
