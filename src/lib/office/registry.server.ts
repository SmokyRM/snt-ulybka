import "server-only";

import { listRegistry } from "@/lib/registry.store";
import type { Plot } from "./types";

export const searchPlots = async (q: string): Promise<Plot[]> => {
  const items = listRegistry({ q });
  return items.map((item) => ({
    id: item.id,
    number: item.plotNumber,
    ownerName: item.ownerName,
    phone: item.phone,
    address: item.email,
  }));
};
