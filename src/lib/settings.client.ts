"use client";

import { OFFICIAL_CHANNELS, type OfficialChannels } from "@/config/officialChannels";
import { PAYMENT_DETAILS, type PaymentDetails } from "@/config/paymentDetails";
import { ContactsSetting, ScheduleSetting, SettingEntry } from "@/types/snt";
import { getSetting } from "@/lib/mockDb";
import { fallbackSetting } from "./settings.shared";

export const getPaymentDetailsSettingClient = () =>
  getSetting<PaymentDetails>("payment_details") ||
  (fallbackSetting("payment_details", PAYMENT_DETAILS) as SettingEntry<PaymentDetails>);

export const getOfficialChannelsSettingClient = () =>
  getSetting<OfficialChannels>("official_channels") ||
  (fallbackSetting("official_channels", OFFICIAL_CHANNELS) as SettingEntry<OfficialChannels>);

export const getContactsSettingClient = () =>
  getSetting<ContactsSetting>("contacts") ||
  (fallbackSetting("contacts", { phone: "", email: "", address: "" }) as SettingEntry<ContactsSetting>);

export const getScheduleSettingClient = () =>
  getSetting<ScheduleSetting>("schedule") ||
  (fallbackSetting("schedule", { items: [] }) as SettingEntry<ScheduleSetting>);
