"use server";

import { redirect } from "next/navigation";
import { removeDocument } from "@/lib/documents.store";

export async function removeDocumentAction(formData: FormData) {
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return;
  removeDocument(id);
  redirect("/office/documents");
}
