import { HeaderClient } from "./HeaderClient";
import { getSessionUser } from "@/lib/session.server";

export default async function Header() {
  const session = await getSessionUser();
  return <HeaderClient role={session?.role ?? null} />;
}
