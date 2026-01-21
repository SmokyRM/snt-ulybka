import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { findPlotById, getDb } from "@/lib/mockDb";
import { listRegistry, getRegistryItem } from "@/lib/registry.store";
import type { Plot } from "@/types/snt";

export type PlotListItem = {
  id: string;
  plotNumber: string;
  street?: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string;
  updatedAt: string;
};

export type PlotDetail = {
  id: string;
  plotId: string;
  plotNumber: string;
  street?: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  cadastral?: string | null;
  notes?: string | null;
  status?: string;
  membershipStatus?: string;
  isConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listPlots(params: { q?: string } = {}): Promise<PlotListItem[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "registry.view", undefined);

  const { q } = params;
  const query = q?.trim().toLowerCase();

  // Ищем в registry
  const registryItems = listRegistry({ q: query });

  // Также ищем в mockDb.plots
  const db = getDb();
  const plots = db.plots.filter((plot) => {
    if (!query) return true;
    const haystack = `${plot.plotNumber} ${plot.street} ${plot.ownerFullName ?? ""} ${plot.phone ?? ""} ${plot.email ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });

  // Объединяем результаты
  const allItems: PlotListItem[] = [];

  // Добавляем из registry
  registryItems.forEach((item) => {
    allItems.push({
      id: item.id,
      plotNumber: item.plotNumber,
      ownerName: item.ownerName,
      phone: item.phone,
      email: item.email,
      status: item.status,
      updatedAt: item.updatedAt,
    });
  });

  // Добавляем из mockDb (если еще нет в registry)
  plots.forEach((plot) => {
    if (!allItems.some((item) => item.id === plot.id)) {
      allItems.push({
        id: plot.id,
        plotNumber: plot.plotNumber,
        street: plot.street,
        ownerName: plot.ownerFullName,
        phone: plot.phone,
        email: plot.email,
        status: plot.status,
        updatedAt: plot.updatedAt,
      });
    }
  });

  return allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getPlot(plotId: string): Promise<PlotDetail | null> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "registry.view", undefined);

  // Сначала ищем в registry
  const registryItem = getRegistryItem(plotId);
  if (registryItem) {
    return {
      id: registryItem.id,
      plotId: registryItem.id,
      plotNumber: registryItem.plotNumber,
      ownerName: registryItem.ownerName,
      phone: registryItem.phone,
      email: registryItem.email,
      status: registryItem.status,
      updatedAt: registryItem.updatedAt,
      createdAt: registryItem.updatedAt,
    };
  }

  // Ищем в mockDb
  const plot = findPlotById(plotId);
  if (!plot) {
    return null;
  }

  return {
    id: plot.id,
    plotId: plot.plotId,
    plotNumber: plot.plotNumber,
    street: plot.street,
    ownerName: plot.ownerFullName,
    phone: plot.phone,
    email: plot.email,
    cadastral: plot.cadastral,
    notes: plot.notes,
    status: plot.status,
    membershipStatus: plot.membershipStatus,
    isConfirmed: plot.isConfirmed,
    createdAt: plot.createdAt,
    updatedAt: plot.updatedAt,
  };
}
