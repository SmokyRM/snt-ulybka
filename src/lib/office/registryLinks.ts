import "server-only";

import { findRegistryByPlotNumber, getRegistryItem } from "@/lib/registry.store";
import { findPlotById } from "@/lib/mockDb";

/**
 * Sprint 4.2: Получает plotId из plotNumber для создания ссылок на registry
 * 
 * @param plotNumber - номер участка (например "Березовая, 12")
 * @returns plotId или null если участок не найден
 */
export function getPlotIdFromPlotNumber(plotNumber: string | null | undefined): string | null {
  if (!plotNumber || !plotNumber.trim()) {
    return null;
  }

  // Сначала ищем в registry
  const registryItem = findRegistryByPlotNumber(plotNumber);
  if (registryItem) {
    return registryItem.id;
  }

  // Ищем в mockDb по plotNumber
  const plot = findPlotById(plotNumber);
  if (plot) {
    return plot.id;
  }

  // Пробуем найти по plotId (если plotNumber это на самом деле ID)
  const plotById = findPlotById(plotNumber);
  if (plotById) {
    return plotById.id;
  }

  return null;
}

/**
 * Sprint 4.2: Получает URL для открытия участка в registry
 * 
 * @param plotNumber - номер участка
 * @param plotId - ID участка (если известен)
 * @returns URL для открытия участка или null если участок не найден
 */
export function getRegistryUrl(plotNumber: string | null | undefined, plotId?: string | null): string | null {
  // Если plotId уже известен, используем его
  if (plotId) {
    return `/office/registry/${plotId}`;
  }

  // Пытаемся найти plotId по plotNumber
  const foundPlotId = getPlotIdFromPlotNumber(plotNumber);
  if (foundPlotId) {
    return `/office/registry/${foundPlotId}`;
  }

  return null;
}
