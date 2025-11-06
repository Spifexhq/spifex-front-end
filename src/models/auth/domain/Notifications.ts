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
