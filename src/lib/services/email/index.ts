export type EmailTemplateKey =
  | "verify_email"
  | "reset_password"
  | "request_new"
  | "request_accepted"
  | "request_declined"
  | "message_new"
  | "purchase_marked"
  | "receipt_confirmation_request"
  | "reminder"
  | "request_expired"
  | "dispute_opened";

export interface SendEmailPayload {
  to: string;
  template: EmailTemplateKey;
  params: Record<string, string>;
  isMarketing?: boolean;
}

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<{ ok: boolean; provider: string; id?: string }>;
}

function renderTemplate(template: EmailTemplateKey, params: Record<string, string>): {
  subject: string;
  text: string;
} {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = params.link ? `${appUrl}${params.link}` : appUrl;

  switch (template) {
    case "verify_email":
      return {
        subject: "אימות כתובת אימייל — מתנת יום הולדת",
        text: `שלום ${params.name ?? ""}, אנא אמת/י את כתובת האימייל שלך בקישור: ${link}`,
      };
    case "reset_password":
      return {
        subject: "איפוס סיסמה — מתנת יום הולדת",
        text: `ביקשת לאפס סיסמה. להמשך לחץ/י כאן: ${link}`,
      };
    case "request_new":
      return {
        subject: `בקשה חדשה להטבה ב-${params.storeName ?? "חנות"}`,
        text: `התקבלה בקשה חדשה להטבת יום ההולדת שלך. לצפייה ומענה בתוך 72 שעות: ${link}`,
      };
    case "request_accepted":
      return {
        subject: "הבקשה שלך אושרה! צ׳אט פנימי נפתח",
        text: `בעל ההטבה אישר את הבקשה שלך. היכנס/י לצ׳אט הפנימי לתיאום: ${link}`,
      };
    case "request_declined":
      return {
        subject: "עדכון לגבי בקשת ההטבה שלך",
        text: `הבקשה לא אושרה או שהטבה נתפסה על ידי בקשה אחרת. ניתן להצטרף לרשימת ההמתנה: ${link}`,
      };
    case "message_new":
      // CRITICAL Spec v2 Section 9: Email notification MUST NOT include message body!
      return {
        subject: "הודעה חדשה בצ׳אט הבקשה — מתנת יום הולדת",
        text: `יש לך הודעה חדשה בבקשה פעילה. מטעמי פרטיות תוכן ההודעה אינו נשלח במייל. לצפייה באתר: ${link}`,
      };
    case "purchase_marked":
      return {
        subject: "בעל ההטבה סימן שהרכישה בוצעה",
        text: `ההזמנה בוצעה! לאחר קבלת המוצר יש לאשר קבלה באתר: ${link}`,
      };
    case "receipt_confirmation_request":
      return {
        subject: "תזכורת לאישור קבלת המוצר",
        text: `האם המוצר הגיע? אנא אשר/י קבלה או פתח/י בירור בעמוד הבקשה: ${link}`,
      };
    case "reminder":
      return {
        subject: params.subject ?? "תזכורת חשובה — מתנת יום הולדת",
        text: `${params.body ?? "יש לך פעולה ממתינה באתר."}\nלצפייה: ${link}`,
      };
    case "request_expired":
      return {
        subject: "פג תוקף בקשת ההטבה",
        text: `פג תוקף הבקשה ללא השלמה. ניתן לחפש הטבות זמינות נוספות באתר: ${link}`,
      };
    case "dispute_opened":
      return {
        subject: "נפתח בירור מנהל (מחלוקת) בבקשה",
        text: `נפתח בירור צוות בנוגע לעסקה. נא להשיב לפרטי הבירור בתוך 5 ימי עסקים: ${link}`,
      };
  }
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: SendEmailPayload) {
    const rendered = renderTemplate(payload.template, payload.params);
    console.info("[Email:Console]", {
      to: payload.to,
      template: payload.template,
      subject: rendered.subject,
    });
    return { ok: true, provider: "console", id: `console-${Date.now()}` };
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private from: string) {}

  async send(payload: SendEmailPayload) {
    const rendered = renderTemplate(payload.template, payload.params);
    const unsubscribeFooter = payload.isMarketing
      ? "\n\nלהסרה מרשימת הדיוור הפרסומי: " + (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/dashboard?tab=settings"
      : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [payload.to],
        subject: rendered.subject,
        text: rendered.text + unsubscribeFooter,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Email:Resend] failed:", errorText);
      return { ok: false, provider: "resend" };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: json.id };
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "מתנת יום הולדת <noreply@birthday-gift.co.il>";
  if (process.env.EMAIL_PROVIDER === "resend" && apiKey) {
    return new ResendEmailProvider(apiKey, from);
  }
  return new ConsoleEmailProvider();
}
