import type { AppNotification, Store } from "@/lib/types";
import type { NotificationTypeSettings } from "@/lib/services/personal-preferences";
import type { WatchSettings } from "@/lib/domain/watchlist-settings";

export type NotificationCategory = "waitlist" | "requests" | "system";

export function notificationCategory(type: string): NotificationCategory {
  if (type === "waitlist_benefit_available") return "waitlist";
  if (/(request|message|store|account|dispute|report)/i.test(type)) return "requests";
  return "system";
}

export function storeForNotification(
  notification: AppNotification,
  stores: Store[]
): Store | undefined {
  if (notification.type !== "waitlist_benefit_available" || !notification.link) {
    return undefined;
  }
  const slug = notification.link.split("/stores/")[1]?.replace(/\/+$/, "");
  return stores.find((s) => s.slug === slug);
}

export function notificationGroupLabel(
  notification: AppNotification,
  stores: Store[]
): string {
  const store = storeForNotification(notification, stores);
  if (store) return store.name_he;
  return notificationCategory(notification.type) === "requests" ? "בקשות ועדכונים" : "מערכת";
}

export function notificationHref(notification: AppNotification): string | null {
  if (!notification.link) return null;
  return notification.link.replace(/^\/requests\/([0-9a-fA-F-]+)$/, "/requests/view?id=$1");
}

export interface NotificationVisibilityOptions {
  stores: Store[];
  notificationTypes: NotificationTypeSettings;
  watchSettings: Record<string, WatchSettings>;
  /** Include waitlist notifications from stores the user muted. */
  showMuted?: boolean;
  now?: number;
}

export function isNotificationVisible(
  notification: AppNotification,
  options: NotificationVisibilityOptions
): boolean {
  const category = notificationCategory(notification.type);
  if (category === "requests") return options.notificationTypes.requests;
  if (category !== "waitlist") return true;
  if (!options.notificationTypes.waitlist) return false;

  const store = storeForNotification(notification, options.stores);
  const mutedUntil = store ? options.watchSettings[store.id]?.mutedUntil : null;
  if (mutedUntil && new Date(mutedUntil).getTime() > (options.now ?? Date.now())) {
    return Boolean(options.showMuted);
  }
  return true;
}

export function countUnreadNotifications(
  notifications: AppNotification[],
  userId: string,
  options: NotificationVisibilityOptions
): number {
  return notifications.filter(
    (n) => n.user_id === userId && !n.read_at && isNotificationVisible(n, options)
  ).length;
}
