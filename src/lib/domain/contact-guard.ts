const PHONE_REGEX = /(?:\+972|0)(?:[\s.-]?\d){8,9}/;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EXTERNAL_CHAT_REGEX = /(?:wa\.me|whatsapp|t\.me|telegram|instagram\.com)/i;

export interface ContactGuardResult {
  hasContactInfo: boolean;
  warningMessage: string | null;
}

/**
 * Non-blocking warning for off-platform contact details in early messages (Spec v2 Section 9)
 */
export function inspectMessageForContactDetails(body: string): ContactGuardResult {
  if (PHONE_REGEX.test(body) || EMAIL_REGEX.test(body) || EXTERNAL_CHAT_REGEX.test(body)) {
    return {
      hasContactInfo: true,
      warningMessage:
        "שים לב: מומלץ לנהל את כל התיאום בצ׳אט הפנימי. לשיתוף טלפון לצורך משלוח, ניתן להפעיל אישור הדדי לחשיפת טלפון.",
    };
  }
  return { hasContactInfo: false, warningMessage: null };
}

/**
 * Strips HTML tags & control characters so free text is stored and rendered strictly as plain text (Section 14.3.7)
 */
export function sanitizePlainText(input: string, maxLength = 2000): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}
