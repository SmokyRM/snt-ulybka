import { DEFAULT_SNT_SETTINGS } from "@/config/sntSettings";
import { fallbackSetting } from "@/lib/settings.shared";
import { getSetting, setSetting } from "@/lib/mockDb";
import { SettingEntry, SntSettings } from "@/types/snt";

export const getSntSettings = (): SettingEntry<SntSettings> =>
  getSetting<SntSettings>("snt_settings") ||
  (fallbackSetting("snt_settings", DEFAULT_SNT_SETTINGS) as SettingEntry<SntSettings>);

export const updateSntSettingsByAdmin = (patch: Partial<SntSettings>) => {
  const current = getSntSettings();
  const nextValue: SntSettings = {
    ...current.value,
    ...patch,
  };
  return setSetting("snt_settings", nextValue);
};
