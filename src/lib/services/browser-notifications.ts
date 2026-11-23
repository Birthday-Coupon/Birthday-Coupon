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
 * Registers the notification service worker. When it is active, notifications
 * are delivered through it, so they stay in the OS notification center and a
 * click opens the right page. There is no push subscription: notifications are
 * only created while the app is open.
 */
export async function ensureNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, {
      scope: `${basePath}/`,
    });
    return registration;
  } catch {
    return null;
  }
}

function resolveLink(link: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (link.startsWith("http")) return link;
  return `${basePath}${link}`;
}

/**
 * Fires a native Browser / Windows OS notification if permission is granted.
 */
export function showBrowserNotification(params: {
  title: string;
  body: string;
  link?: string | null;
  tag?: string;
}): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (window.Notification.permission !== "granted") return false;

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const link = params.link ? resolveLink(params.link) : null;

  const fallback = () => {
    try {
      const notification = new window.Notification(params.title, {
        body: params.body,
        icon: `${basePath}/images/hero-3d.jpg`,
        dir: "rtl",
        lang: "he",
        tag: params.tag,
      });
      if (link) {
        notification.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      }
      return true;
    } catch {
      return false;
    }
  };

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration) {
          fallback();
          return;
        }
        return registration.showNotification(params.title, {
          body: params.body,
          icon: `${basePath}/images/hero-3d.jpg`,
          dir: "rtl",
          lang: "he",
          tag: params.tag,
          data: { link },
        });
      })
      .catch(() => {
        fallback();
      });
    return true;
  }

  return fallback();
}
