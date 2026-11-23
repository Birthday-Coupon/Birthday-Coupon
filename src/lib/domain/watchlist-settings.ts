import type { Store, UserBenefit } from "@/lib/types";

export interface WatchSettings {
  /** Minimum percentage discount, relevant for percentage stores. */
  minDiscountPercent: number | null;
  onlyVerified: boolean;
  /** ISO timestamp; notifications from this store are hidden until then. */
  mutedUntil: string | null;
}

export const DEFAULT_WATCH_SETTINGS: WatchSettings = {
  minDiscountPercent: null,
  onlyVerified: false,
  mutedUntil: null,
};

export interface WaitlistRow {
  store_id: string;
  min_discount_percent: number | null;
  only_verified: boolean | null;
  muted_until: string | null;
}

export function watchSettingsFromRow(row: WaitlistRow): WatchSettings {
  return {
    minDiscountPercent:
      row.min_discount_percent === null ? null : Number(row.min_discount_percent),
    onlyVerified: Boolean(row.only_verified),
    mutedUntil: row.muted_until ?? null,
  };
}

/** Maps UI settings to the waitlist columns written to the database. */
export function watchSettingsToRow(settings: WatchSettings) {
  return {
    min_discount_percent: settings.minDiscountPercent,
    only_verified: settings.onlyVerified,
    muted_until: settings.mutedUntil,
  };
}

export function isStoreMuted(
  settings: WatchSettings | undefined,
  now: number = Date.now()
): boolean {
  if (!settings?.mutedUntil) return false;
  return new Date(settings.mutedUntil).getTime() > now;
}

/** Applies a store's watch settings to a single benefit. */
export function passesWatchSettings(
  store: Store,
  benefit: UserBenefit,
  settings: WatchSettings | undefined
): boolean {
  if (!settings) return true;
  if (settings.onlyVerified && !benefit.is_verified) return false;
  if (settings.minDiscountPercent && store.benefit_type === "percentage") {
    const match = /(\d+(?:\.\d+)?)/.exec(store.discount_value);
    if (match && Number(match[1]) < settings.minDiscountPercent) return false;
  }
  return true;
}
