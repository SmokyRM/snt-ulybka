import {
  addEntityVersion,
  getEntityVersionById,
  getSetting,
  listEntityVersions,
  setSetting,
} from "@/lib/mockDb";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { ContactsSetting, ScheduleSetting, SettingEntry, UserRole } from "@/types/snt";

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

export const getContactsSetting = () =>
  getSetting<ContactsSetting>("contacts") || fallbackSetting("contacts", { phone: "", email: "", address: "" });

export const updateContactsSetting = (
  value: ContactsSetting,
  meta?: { actorUserId?: string | null; actorRole?: UserRole | null; comment?: string | null }
) => {
  const before = getContactsSetting();
  const saved = setSetting("contacts", value);
  addEntityVersion({
    entity: "contacts",
    entityId: "contacts",
    before: before.value,
    after: saved.value,
    actorUserId: meta?.actorUserId ?? null,
    comment: meta?.comment ?? null,
  });
  return saved;
};

export const getScheduleSetting = () =>
  getSetting<ScheduleSetting>("schedule") || fallbackSetting("schedule", { items: [] });

export const updateScheduleSetting = (
  value: ScheduleSetting,
  meta?: { actorUserId?: string | null; actorRole?: UserRole | null; comment?: string | null }
) => {
  const before = getScheduleSetting();
  const saved = setSetting("schedule", value);
  addEntityVersion({
    entity: "schedule",
    entityId: "schedule",
    before: before.value,
    after: saved.value,
    actorUserId: meta?.actorUserId ?? null,
    comment: meta?.comment ?? null,
  });
  return saved;
};

export const restoreSettingVersion = (opts: {
  versionId: string;
  actorUserId?: string | null;
  comment?: string | null;
}) => {
  const version = getEntityVersionById(opts.versionId);
  if (!version) return null;
  const entity = version.entity;
  const after = version.after;
  if (!after) return null;

  if (entity === "requisites") {
    const saved = updatePaymentDetailsSetting(after as typeof PAYMENT_DETAILS, {
      actorUserId: opts.actorUserId,
      comment: opts.comment ?? `Откат к версии #${version.version}`,
    });
    return { restored: saved, sourceVersion: version };
  }

  if (entity === "social_links") {
    const saved = updateOfficialChannelsSetting(after as typeof OFFICIAL_CHANNELS, {
      actorUserId: opts.actorUserId,
      comment: opts.comment ?? `Откат к версии #${version.version}`,
    });
    return { restored: saved, sourceVersion: version };
  }

  if (entity === "contacts") {
    const saved = updateContactsSetting(after as ContactsSetting, {
      actorUserId: opts.actorUserId,
      comment: opts.comment ?? `Откат к версии #${version.version}`,
    });
    return { restored: saved, sourceVersion: version };
  }

  if (entity === "schedule") {
    const saved = updateScheduleSetting(after as ScheduleSetting, {
      actorUserId: opts.actorUserId,
      comment: opts.comment ?? `Откат к версии #${version.version}`,
    });
    return { restored: saved, sourceVersion: version };
  }

  return null;
};
