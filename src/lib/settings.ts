import { addEntityVersion, getSetting, setSetting, listEntityVersions } from "@/lib/mockDb";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { SettingEntry } from "@/types/snt";
import { UserRole } from "@/types/snt";

const fallbackSetting = <T>(key: string, defaultValue: T): SettingEntry<T> => ({
  key,
  value: defaultValue,
  createdAt: "",
  updatedAt: "",
});

export const getPaymentDetailsSetting = () =>
  getSetting<typeof PAYMENT_DETAILS>("payment_details") ||
  fallbackSetting("payment_details", PAYMENT_DETAILS);

export const updatePaymentDetailsSetting = (
  value: typeof PAYMENT_DETAILS,
  meta?: { actorUserId?: string | null; actorRole?: UserRole | null; comment?: string | null }
) => {
  const before = getPaymentDetailsSetting();
  const saved = setSetting("payment_details", value);
  addEntityVersion({
    entity: "requisites",
    entityId: "payment_details",
    before: before.value,
    after: saved.value,
    actorUserId: meta?.actorUserId ?? null,
    comment: meta?.comment ?? null,
  });
  return saved;
};

export const getOfficialChannelsSetting = () =>
  getSetting<typeof OFFICIAL_CHANNELS>("official_channels") ||
  fallbackSetting("official_channels", OFFICIAL_CHANNELS);

export const updateOfficialChannelsSetting = (
  value: typeof OFFICIAL_CHANNELS,
  meta?: { actorUserId?: string | null; actorRole?: UserRole | null; comment?: string | null }
) => {
  const before = getOfficialChannelsSetting();
  const saved = setSetting("official_channels", value);
  addEntityVersion({
    entity: "social_links",
    entityId: "official_channels",
    before: before.value,
    after: saved.value,
    actorUserId: meta?.actorUserId ?? null,
    comment: meta?.comment ?? null,
  });
  return saved;
};

export const formatAdminTime = (raw?: string | null) => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const listSettingVersions = (
  entity: "requisites" | "social_links",
  entityId: string | null = null,
  limit = 50
) => listEntityVersions({ entity, entityId, limit });
