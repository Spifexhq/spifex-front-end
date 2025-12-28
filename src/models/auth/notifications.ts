// src/models/notifications.ts

export type NotificationCategory =
  | "security"
  | "billing"
  | "product_updates"
  | "newsletter"
  | "marketing"
  | "reminders";

export type NotificationChannel = "email"; // for now

export interface NotificationPreference {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

/* ----------------------------- Requests / Responses ---------------------------- */

export type GetNotificationPreferencesResponse = NotificationPreference[];

export interface UpdateNotificationPreferenceItem {
  category: NotificationCategory | string; // allow forward compatibility if backend adds categories
  enabled: boolean;
}

export type UpdateNotificationPreferencesRequest = UpdateNotificationPreferenceItem[];
export type UpdateNotificationPreferencesResponse = NotificationPreference[];
