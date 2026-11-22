import type { EligibilityWindowType } from "@/lib/types";

export const ISRAEL_TIMEZONE = "Asia/Jerusalem";
export const MINIMUM_AGE_YEARS = 18;

export interface EligibilityWindow {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in Asia/Jerusalem timezone.
 */
export function getTodayInIsrael(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dateStr: string, deltaDays: number): string {
  const d = parseIsoDate(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return formatUtcDate(d);
}

/**
 * Resolves the birthday date in a given calendar year.
 * Spec v2 Section 6.3: Feb 29 in non-leap years resolves to Feb 28.
 */
export function resolveBirthdayForYear(birthMonth: number, birthDay: number, year: number): string {
  const adjustedDay = birthMonth === 2 && birthDay === 29 && !isLeapYear(year) ? 28 : birthDay;
  const maxDayInMonth = new Date(Date.UTC(year, birthMonth, 0)).getUTCDate();
  const safeDay = Math.min(adjustedDay, maxDayInMonth);
  return `${year}-${String(birthMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

/**
 * Computes eligibility window for a birthday benefit, handling:
 * - Asia/Jerusalem dates
 * - Feb 29 in non-leap years -> Feb 28
 * - Cross-year boundaries (Dec–Jan)
 */
export function computeEligibilityWindow(params: {
  birthMonth: number;
  birthDay: number;
  referenceYear: number;
  windowType: EligibilityWindowType;
  daysBefore?: number;
  daysAfter?: number;
  customStart?: string;
  customEnd?: string;
}): EligibilityWindow {
  const {
    birthMonth,
    birthDay,
    referenceYear,
    windowType,
    daysBefore = 0,
    daysAfter = 0,
    customStart,
    customEnd,
  } = params;

  if (windowType === "custom_range" && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  const anchor = resolveBirthdayForYear(birthMonth, birthDay, referenceYear);

  switch (windowType) {
    case "day":
      return { startDate: anchor, endDate: anchor };
    case "week":
      return {
        startDate: addDays(anchor, -3),
        endDate: addDays(anchor, 3),
      };
    case "month": {
      const lastDay = new Date(Date.UTC(referenceYear, birthMonth, 0)).getUTCDate();
      const mStr = String(birthMonth).padStart(2, "0");
      return {
        startDate: `${referenceYear}-${mStr}-01`,
        endDate: `${referenceYear}-${mStr}-${String(lastDay).padStart(2, "0")}`,
      };
    }
    case "days_around":
    default:
      return {
        startDate: addDays(anchor, -Math.abs(daysBefore)),
        endDate: addDays(anchor, Math.abs(daysAfter)),
      };
  }
}

/**
 * Checks if today (Asia/Jerusalem) falls within the benefit's eligibility window (inclusive).
 */
export function isDateWithinWindow(
  windowStartDate: string,
  windowEndDate: string,
  todayIsrael: string = getTodayInIsrael()
): boolean {
  return todayIsrael >= windowStartDate && todayIsrael <= windowEndDate;
}

/**
 * Returns remaining days until window_end_date (in Israel timezone). Negative if expired.
 */
export function daysUntilWindowEnd(
  windowEndDate: string,
  todayIsrael: string = getTodayInIsrael()
): number {
  const endMs = parseIsoDate(windowEndDate).getTime();
  const todayMs = parseIsoDate(todayIsrael).getTime();
  return Math.round((endMs - todayMs) / 86_400_000);
}

/**
 * Checks whether a 7-day expiry warning should be triggered (Section 6.5).
 */
export function shouldSendExpiryWarning(
  windowEndDate: string,
  todayIsrael: string = getTodayInIsrael()
): boolean {
  const remaining = daysUntilWindowEnd(windowEndDate, todayIsrael);
  return remaining >= 0 && remaining <= 7;
}

/**
 * Strict 18+ age verification (Spec v2 Section 2.13, 14.1, Scenario 15).
 */
export function verifyMinimumAge(
  birthDateIso: string,
  todayIsrael: string = getTodayInIsrael()
): { valid: boolean; ageYears: number; reason?: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateIso);
  if (!match) {
    return { valid: false, ageYears: 0, reason: "פורמט תאריך לידה לא תקין." };
  }
  const [, byStr, bmStr, bdStr] = match;
  const [ty, tm, td] = todayIsrael.split("-").map(Number);
  const by = Number(byStr);
  const bm = Number(bmStr);
  const bd = Number(bdStr);

  if (bm < 1 || bm > 12 || bd < 1 || bd > 31 || by < 1900 || by > ty) {
    return { valid: false, ageYears: 0, reason: "תאריך לידה אינו תקין." };
  }

  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) {
    age -= 1;
  }

  if (age < MINIMUM_AGE_YEARS) {
    return {
      valid: false,
      ageYears: age,
      reason: `ההרשמה לאתר מותרת מגיל ${MINIMUM_AGE_YEARS} ומעלה בלבד.`,
    };
  }

  return { valid: true, ageYears: age };
}
