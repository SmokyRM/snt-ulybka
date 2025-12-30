import { fallbackSetting } from "@/lib/settings.shared";
import { getSetting, setSetting } from "@/lib/mockDb";
import type { SettingEntry } from "@/types/snt";

export const MEMBERSHIP_TARIFF_KEY = "membership_monthly_amount";
export const DEFAULT_MEMBERSHIP_MONTHLY_AMOUNT = 5000;

export const getMembershipTariffSetting = (): SettingEntry<number> =>
  getSetting<number>(MEMBERSHIP_TARIFF_KEY) ||
  (fallbackSetting(
    MEMBERSHIP_TARIFF_KEY,
    DEFAULT_MEMBERSHIP_MONTHLY_AMOUNT
  ) as SettingEntry<number>);

export const updateMembershipTariffByAdmin = (amount: number): SettingEntry<number> =>
  setSetting<number>(MEMBERSHIP_TARIFF_KEY, amount);
