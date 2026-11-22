"use client";

export type BrowserNotificationPermission = "default" | "granted" | "denied" | "unsupported";

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isBrowserNotificationSupported()) return "unsupported";
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

/**
 * Fires a native Browser / Windows OS notification if permission is granted.
 */
export function showBrowserNotification(params: {
  title: string;
  body: string;
  link?: string | null;
}): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (window.Notification.permission !== "granted") return false;

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const notification = new window.Notification(params.title, {
      body: params.body,
      icon: `${basePath}/images/hero-3d.jpg`,
      dir: "rtl",
      lang: "he",
    });

    if (params.link) {
      notification.onclick = () => {
        window.focus();
        const target = params.link!.startsWith("http")
          ? params.link!
          : `${basePath}${params.link!}`;
        window.location.href = target;
      };
    }
    return true;
  } catch {
    return false;
  }
}
