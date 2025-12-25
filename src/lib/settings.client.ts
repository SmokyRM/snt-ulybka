"use client";

import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { ContactsSetting, ScheduleSetting, SettingEntry } from "@/types/snt";
import { getSetting } from "@/lib/mockDb";
import { fallbackSetting } from "./settings.shared";

export const getPaymentDetailsSettingClient = () =>
  getSetting<typeof PAYMENT_DETAILS>("payment_details") ||
  (fallbackSetting("payment_details", PAYMENT_DETAILS) as SettingEntry<typeof PAYMENT_DETAILS>);

export const getOfficialChannelsSettingClient = () =>
  getSetting<typeof OFFICIAL_CHANNELS>("official_channels") ||
  (fallbackSetting("official_channels", OFFICIAL_CHANNELS) as SettingEntry<typeof OFFICIAL_CHANNELS>);

export const getContactsSettingClient = () =>
  getSetting<ContactsSetting>("contacts") ||
  (fallbackSetting("contacts", { phone: "", email: "", address: "" }) as SettingEntry<ContactsSetting>);

export const getScheduleSettingClient = () =>
  getSetting<ScheduleSetting>("schedule") ||
  (fallbackSetting("schedule", { items: [] }) as SettingEntry<ScheduleSetting>);
