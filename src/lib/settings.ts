import { getSetting, setSetting } from "@/lib/mockDb";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { SettingEntry } from "@/types/snt";

const fallbackSetting = <T>(key: string, defaultValue: T): SettingEntry<T> => ({
  key,
  value: defaultValue,
  createdAt: "",
  updatedAt: "",
});

export const getPaymentDetailsSetting = () =>
  getSetting<typeof PAYMENT_DETAILS>("payment_details") ||
  fallbackSetting("payment_details", PAYMENT_DETAILS);

export const updatePaymentDetailsSetting = (value: typeof PAYMENT_DETAILS) =>
  setSetting("payment_details", value);

export const getOfficialChannelsSetting = () =>
  getSetting<typeof OFFICIAL_CHANNELS>("official_channels") ||
  fallbackSetting("official_channels", OFFICIAL_CHANNELS);

export const updateOfficialChannelsSetting = (value: typeof OFFICIAL_CHANNELS) =>
  setSetting("official_channels", value);

export const formatAdminTime = (raw?: string | null) => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
