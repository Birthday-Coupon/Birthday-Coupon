# מתנת יום הולדת (Birthday Gift IL)

פלטפורמה קהילתית חינמית (RTL עברית) המחברת בין בעלי הטבות יום הולדת במועדוני לקוחות מאושרים לבין קונים בישראל — בלי לשתף סיסמאות, קופונים אישיים או פרטי אשראי.

## ארכיטקטורה טכנולוגית
- **Frontend & Server:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 (RTL עברית, נגישות WCAG 2.1 AA, עיצוב תלת-ממד פסטלי לבנדר וצהוב חמאתי).
- **Database & Auth:** Supabase PostgreSQL + Supabase Auth + Row Level Security (RLS) מלא על כל טבלה + פונקציות RPC אטומיות למניעת מירוצים (Race Conditions).
- **Email Abstraction:** שכבת הפשטה (`src/lib/services/email`) התומכת ב-Resend בייצור וב-Console Logger בפיתוח.
- **Deployment & Cron:** Vercel + Vercel Cron (או Supabase `pg_cron`).

## מכונת מצבים (State Machines — סעיף 5)
### סטטוס הטבה (`benefit_status`)
`pending_verification` → `active` ⇄ `hidden` | `active` → `reserved` → `redeemed` | `expired` | `removed`

### סטטוס בקשה (`request_status`)
- `pending` → `accepted` | `declined` | `info_requested` | `cancelled` | `expired` (72 שעות)
- `info_requested` → `pending` | `accepted` | `declined` | `cancelled` | `expired`
- `accepted` → `purchased` | `cancelled` | `expired` (7 ימים). אישור בקשה נועל את ההטבה ל-`reserved` ודוחה אוטומטית בקשות ממתינות אחרות (`accept_purchase_request` RPC).
- `purchased` → `completed` (באישור הקונה בלבד — **אין השלמה אוטומטית!**) | `disputed` (אין ביטול לאחר רכישה).
- `disputed` → `resolved_completed` | `resolved_cancelled` (מנהל בלבד).

## מדיניות הרשאות ופרטיות (RLS)
- כל הטבלאות ב-`supabase/migrations/0001_initial_schema.sql` מוגנות ב-`ENABLE ROW LEVEL SECURITY`.
- **הפרדת מידע אישי:** תאריך לידה מלא וטלפון נשמרים אך ורק ב-`user_private` (גישה לבעל החשבון בלבד), ואינם קיימים ב-`public.users`.
- **הפרדת תפקידים:** תפקידים (`user`, `content_manager`, `admin`) מנוהלים בטבלה נפרדת `user_roles`.
- **שער חוקיות:** ברירת מחדל מחמירה — חנויות `prohibited` ו-`unverified` מוצגות למידע בלבד עם `noindex` וללא אפשרות לפרסם הטבות או לשלוח בקשות.

## סדר הפעלת משימות מתוזמנות (Scheduled Jobs)
הפונקציה `public.run_scheduled_maintenance()` ב-`supabase/migrations/0002_scheduled_jobs.sql` (מופעלת כל שעה דרך `vercel.json` -> `/api/cron/maintenance` עם כותרת `Authorization: Bearer <CRON_SECRET>`, או דרך `pg_cron` ב-Supabase):
1. פקיעת בקשות `pending`/`info_requested` לאחר 72 שעות.
2. פקיעת בקשות `accepted` לאחר 7 ימים והחזרת ההטבה ל-`active` אם חלון הזכאות (לפי `Asia/Jerusalem`) עדיין פתוח.
3. פתיחת בירור מנהל (`disputed`) אוטומטית לבקשות `purchased` לאחר 14 יום ללא אישור קונה.
4. פקיעת הטבות `active` שחלון הזכאות שלהן הסתיים (תוך שמירה על בקשות שכבר אושרו עד 7 ימים).
5. שליחת התראת 7 ימים לפני תום חלון זכאות לבעלי הטבות.

## הרצה מקומית ובדיקות
```bash
npm install
npm run test       # הרצת בדיקות יחידה (State Machine, Eligibility Windows, Feb 29, Age 18+, Legality Gate)
npm run typecheck  # בדיקת TypeScript
npm run build      # בניית ייצור
npm run dev        # פיתוח מקומי (http://localhost:3000)
```

## חיבור ל-Supabase ופריסה ב-Vercel
1. צור פרויקט חדש ב-[Supabase](https://supabase.com/dashboard).
2. פתח את **SQL Editor** והרץ לפי הסדר:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_scheduled_jobs.sql`
   - `supabase/seed/stores_seed.sql` (מאגר 9 החנויות שנבדקו)
3. ב-**Project Settings → API** העתק את `Project URL`, `anon public key`, ו-`service_role key`.
4. העתק את `.env.example` ל-`.env.local` ומלא את המפתחות.
5. ייבא את הריפוזיטורי ל-[Vercel](https://vercel.com/new), הזן את אותם משתני סביבה (כולל `CRON_SECRET`), ולחץ **Deploy**.

## מסמכים נוספים
- [הנחיות מדיניות תוכן וחוקיות לצוות הניהול](docs/CONTENT_AND_LEGAL_POLICY.md)
- [בדיקות אימות RLS](supabase/tests/rls_verification.sql)
