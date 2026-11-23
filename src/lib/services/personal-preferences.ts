"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface NotificationTypeSettings {
  waitlist: boolean;
  requests: boolean;
  reminders: boolean;
}

export interface PersonalPreferences {
  lastSeenAt: string | null;
  notificationTypes: NotificationTypeSettings;
}

const STORAGE_PREFIX = "birthday_gift_il_personal_v1";

const DEFAULT_PREFERENCES: PersonalPreferences = {
  lastSeenAt: null,
  notificationTypes: { waitlist: true, requests: true, reminders: true },
};

const PREFERENCE_ROW_TYPES: Record<keyof NotificationTypeSettings, string> = {
  waitlist: "waitlist_benefit_available",
  requests: "request_update",
  reminders: "lifecycle_reminder",
};

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function loadPersonalPreferences(userId: string): PersonalPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<PersonalPreferences>;
    return {
      lastSeenAt: parsed.lastSeenAt ?? null,
      notificationTypes: {
        ...DEFAULT_PREFERENCES.notificationTypes,
        ...(parsed.notificationTypes ?? {}),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Mirrors the in-app type toggles into the existing notification_preferences
 * table. Email stays off: only in_app_enabled is written.
 */
async function syncNotificationPreferences(
  userId: string,
  types: NotificationTypeSettings
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const rows = (Object.keys(PREFERENCE_ROW_TYPES) as (keyof NotificationTypeSettings)[]).map(
    (key) => ({
      user_id: userId,
      type: PREFERENCE_ROW_TYPES[key],
      in_app_enabled: types[key],
      email_enabled: false,
    })
  );
  await supabase
    .from("notification_preferences")
    .upsert(rows, { onConflict: "user_id,type" });
}

export function savePersonalPreferences(
  userId: string,
  preferences: PersonalPreferences
): void {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey(userId);
    const next = JSON.stringify(preferences);
    // Skip the write when nothing actually changed (e.g. a visit marker update
    // that produced the same payload).
    if (window.localStorage.getItem(key) === next) return;
    window.localStorage.setItem(key, next);
  } catch {
    // Storage can be full or blocked; preferences are a nice-to-have.
  }
}

function sameNotificationTypes(
  a: NotificationTypeSettings,
  b: NotificationTypeSettings
): boolean {
  return (
    a.waitlist === b.waitlist &&
    a.requests === b.requests &&
    a.reminders === b.reminders
  );
}

export function usePersonalPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<PersonalPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const lastSynced = useRef<{ userId: string; types: NotificationTypeSettings } | null>(null);

  useEffect(() => {
    if (!userId) {
      setPreferences(DEFAULT_PREFERENCES);
      lastSynced.current = null;
      setLoaded(false);
      return;
    }
    const stored = loadPersonalPreferences(userId);
    setPreferences(stored);
    // Loading is not a change: never push preferences to the server on mount.
    lastSynced.current = { userId, types: stored.notificationTypes };
    setLoaded(true);
  }, [userId]);

  const updatePreferences = useCallback(
    (updater: (previous: PersonalPreferences) => PersonalPreferences) => {
      setPreferences((previous) => {
        const next = updater(previous);
        if (!userId) return next;

        savePersonalPreferences(userId, next);

        // Only a real change to the type toggles reaches notification_preferences.
        const synced = lastSynced.current;
        if (!synced || synced.userId !== userId) {
          lastSynced.current = { userId, types: next.notificationTypes };
          return next;
        }
        if (!sameNotificationTypes(synced.types, next.notificationTypes)) {
          lastSynced.current = { userId, types: next.notificationTypes };
          void syncNotificationPreferences(userId, next.notificationTypes);
        }
        return next;
      });
    },
    [userId]
  );

  return [preferences, updatePreferences, loaded] as const;
}
