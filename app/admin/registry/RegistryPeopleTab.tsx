"use client";

import AdminRegistryClient from "./AdminRegistryClient";
import type { RegistryPerson } from "@/types/snt";

interface EnrichedPerson extends RegistryPerson {
  plotsData: Array<{
    id: string;
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress?: string | null;
  }>;
}

interface RegistryPeopleTabProps {
  initialPersons: EnrichedPerson[];
  initialQuery?: string;
  initialVerificationStatus?: "not_verified" | "pending" | "verified" | "rejected";
}

export default function RegistryPeopleTab({
  initialPersons,
  initialQuery,
  initialVerificationStatus,
}: RegistryPeopleTabProps) {
  return (
    <AdminRegistryClient
      initialPersons={initialPersons}
      initialQuery={initialQuery}
      initialVerificationStatus={initialVerificationStatus}
    />
  );
}
