# תדריך שינויים — "מתנת יום הולדת"

מסמך זה מתאר את כל השינויים שבוצעו בקוד האתר, את ההחלטות מאחוריהם, ואת מה שסוכן קוד חדש חייב לדעת לפני שהוא נוגע במשהו. נכתב בסוף סבב העבודה, ומתייחס למצב הקוד הנוכחי.

---

## 1. תקציר במשפט

האתר עבר ריענון ממשק (פחות טקסטים ולשוניות, מסך נקי), נבנה מחדש האזור האישי סביב "מה אפשר לבקש עכשיו" והתראות על חנויות במעקב, נוספו מרכז התראות, תזכורות, מיון אישי וסטטוס לכל חנות, הגדרות מעקב פר-חנות נשמרות בשרת, והדף הכבד פוצל לרכיבים ומודולים.

---

## 2. הרצה, בדיקות ומצב ריצה

- Next.js 15 App Router, `output: "export"` (static export), RTL עברית. **לא נוספו תלויות חדשות** (`package.json` לא שונה).
- פקודות:
  - `npm run dev` — פיתוח (בסבב הזה הורץ בפורט 3006).
  - `npm run typecheck` — `tsc --noEmit`.
  - `npm run build` — static export.
  - `npx eslint <paths>` — לבדיקת lint ממוקדת.
- מצבי ריצה:
  - אם `.env.local` מכיל `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` תקינים — `mode === "supabase"` והאזור האישי דורש התחברות.
  - אחרת — `mode === "demo"`, עם נתוני דמו מתוך `src/lib/data/seed-stores.ts`, משתמש ברירת מחדל `demo-buyer-1`, ושמירה ב-`localStorage` תחת `birthday_gift_il_state_v1`.
- **חשוב תפעולית:** אין להריץ `next build` כאשר `next dev` רץ על אותה תיקייה — שניהם כותבים ל-`.next` וזה מייצר 500 עם `MODULE_NOT_FOUND` / שגיאות RSC manifest. אם קרה: לעצור את השרת, `rm -rf .next`, ולהריץ מחדש.

---

## 3. שלב א' — פישוט הממשק

| קובץ | מה השתנה |
|---|---|
| `src/components/Navbar.tsx` | ניווט מינימלי: חנויות, האזור האישי (עם מונה לא-נקראו), כפתור פרסום, התחברות/התנתקות ותפריט נייד. בורר משתמש ההדגמה הוסר מהניווט. |
| `src/components/Footer.tsx` | שתי קבוצות קישורים קצרות + שורת זכויות. קישורי safety/legality/takedown/terms/privacy/accessibility/suggest-store/contact עברו לכאן. |
| `src/components/SystemBannerBar.tsx` | פס הדמו קוצר לשורה אחת. |
| `src/app/page.tsx` | עמוד בית קצר: hero קומפקטי, חיפוש, שני כפתורים, "זמין עכשיו" (עד 4), שלושה צעדים ושורת אמון. |
| `src/app/stores/page.tsx` | חיפוש + צ'יפי קטגוריות + כפתור "סינון" שפותח סוג/מיון/תנאים. |
| `src/components/StoreCard.tsx` | כרטיס קצר: לוגו מילולי, הנחה, תיאור קצר, זמינות וכפתור. |
| `src/app/stores/[slug]/StoreDetailClient.tsx` | כפתור מעקב "עדכנו אותי"/"במעקב — הסרה", תנאי מועדון ב-`details`, טופס בקשה מהודק עם כל השדות והאישורים. |

העיקרון: להסתיר מהתצוגה, לא להסיר פונקציונליות. קישורים משניים עברו לפוטר, סינון מתקדם נכנס ל-`details`/כפתור, וכל הפעולות נשארו.

---

## 4. שלב ב' — האזור האישי והתראות חנויות

### 4.1 מבנה הלשוניות
`src/app/dashboard/page.tsx` — ארבע לשוניות בלבד: **בית · בקשות · ההטבות שלי · הגדרות**. התראות ורשימת המתנה מוזגו למסך "בית".

### 4.2 "אפשר לבקש עכשיו"
מוצג לפי `selectAvailableNow` (`src/lib/domain/personal-feed.ts`):
1. הטבות `status === "active"` שבתוך חלון הזכאות (`isDateWithinWindow`).
2. בחנות שעוברת `evaluateStoreLegalityGate(store).canAcceptRequests`.
3. מסונן לפי הגדרות המעקב של החנות (`passesWatchSettings`: רף הנחה, רק מאומתות).
4. מיון: רלוונטיות לחודש הלידה של המשתמש (`isBirthMonthRelevant`) → חנויות במעקב → הכי דחוף לפי `daysUntilWindowEnd`.
5. `groupAvailableByUrgency` מגביל ל-5 פריטים ומקבץ ל"נגמר היום או מחר / עד 3 ימים / השבוע / בהמשך", עם "עוד X הטבות בספריית החנויות".

### 4.3 חנויות במעקב וסטטוס
- המעקב עצמו משתמש בטבלת `waitlist` הקיימת דרך `toggleWaitlist` (אין מנגנון חדש).
- `getStoreWatchStatus` מחזיר לכל חנות: "N הטבות זמינות עכשיו" / "ההטבה הבאה נפתחת בעוד N ימים" / "החלון הקודם נסגר" / "אין הטבות כרגע" / "החנות אינה זמינה לבקשות".
- `suggestWatchedStores` מציע עד 3 חנויות (קודם כאלה שכבר ביקשו מהן, אחר כך עם הכי הרבה הטבות) כשמעקבים אחרי פחות מ-3 חנויות.

### 4.4 מרכז התראות
- פיד "עדכונים" (עד 4 לא-נקראו) + `details` "כל ההתראות".
- סינון: הכל / חנויות במעקב / בקשות / מערכת.
- קיבוץ לפי חנות (עבור `waitlist_benefit_available`) או "בקשות ועדכונים" / "מערכת".
- "סמן הכל כנקרא" (`markAllNotificationsRead`, נוסף ל-`app-context`), "סמן כנקרא" בודד, השתקת חנות ל-7 ימים מתוך ההתראה, והצגה/הסתרה של התראות מושתקות.

### 4.5 תזכורות מחזור-חיים
`buildLifecycleReminders` (מוצג כ"כדאי לטפל", עד 4):
- בקשה מאושרת/נרכשה שהחלון שלה נסגר ב-0–2 ימים.
- ההטבה של המשתמש פעילה, אין עליה פניות, ונסגרת ב-0–3 ימים.
- בקשת רכישה שממתינה לתשובת הבעלים מעל 24 שעות.

### 4.6 "מה חדש מאז הביקור האחרון"
נשמר `lastSeenAt` לכל משתמש, מוצג "X מאז הביקור האחרון" בראש העדכונים ובמרכז ההתראות. הסימון נכתב 4 שניות אחרי טעינת הדף כדי שהתגים יישארו יציבים בסשן.

### 4.7 העדפות סוג התראה
בהגדרות: "הטבות חדשות בחנויות במעקב", "בקשות ועדכונים על ההטבות שלי", "תזכורות למימוש ולפקיעה". נשמרות ב-`localStorage` ומסונכרנות לטבלת `notification_preferences` הקיימת — **רק `in_app_enabled`**, עם `email_enabled: false`. סנכרון השרת קורה **רק כשהמתגים משתנים** (ראו סעיף 6).

### 4.8 התראות דפדפן
`src/lib/services/browser-notifications.ts` + `public/sw.js`:
- רישום Service Worker דרך `ensureNotificationServiceWorker()`.
- `showBrowserNotification` שולח דרך `registration.showNotification` (עם `data.link`), עם נפילה לאחור ל-`new Notification` ול-`onclick`.
- **מוגבלות מוצרית מכוונת:** אין Web Push אמיתי, ולכן התראות נוצרות רק כשהאתר פתוח. אין התראות מייל (הוחלט במפורש שלא להוסיף בגלל מסלולים חינמיים).

### 4.9 הגדרות מעקב פר-חנות
לכל חנות במעקב: רף הנחה (%), "רק הטבות מאומתות", השתקה ל-24 שעות / 7 ימים. הגדרות אלה **נשמרות בשרת** (סעיף 7).

---

## 5. שלב ג' — תיקון שמירת העדפות

- `savePersonalPreferences` כותב רק ל-`localStorage`, ומדלג אם ה-JSON זהה לקיים.
- הסתנכרנות ל-`notification_preferences` הוצאה מהשמירה ועברה ל-`updatePreferences`, עם `lastSynced` ref שמכיל `{ userId, types }`. לכן:
  - עדכון `lastSeenAt`, רף הנחה, "רק מאומתות" והשתקה לא נוגעים בשרת.
  - טעינה אינה שינוי, ולכן אין upsert בכניסה לדף.
- שדה רף ההנחה ב-`WatchSettingsEditor`: `discountDraft` מקומי, שמירה ב-`blur` או Enter, קיצוב ל-0–100, והחזרת ערך קודם בקלט לא תקין. אין כתיבה בכל הקלדה.

---

## 6. שלב ד' — פיצול רכיבים ומודולים (רפקטור)

### קבצים חדשים
| קובץ | תפקיד |
|---|---|
| `src/components/dashboard/DashboardHome.tsx` | כל לשונית "בית": תזכורות, הצעות מעקב, עדכונים, בקשות ממתינות, "אפשר לבקש עכשיו", חנויות במעקב ומרכז ההתראות. |
| `src/components/dashboard/RequestsPanel.tsx` | לשונית בקשות + מתג שקיבלתי/ששלחתי. |
| `src/components/dashboard/BenefitsPanel.tsx` | לשונית ההטבות שלי: עריכת תאריכים והערות, הסתרה/הפעלה, "מומשה", הסרה. |
| `src/components/dashboard/WatchSettingsEditor.tsx` | עורך הגדרות מעקב לחנות (עם ה-draft של רף ההנחה). |
| `src/lib/domain/personal-feed.ts` | מיון/קיבוץ "אפשר לבקש עכשיו", סטטוס חנות, הצעות מעקב ותזכורות מחזור-חיים. |
| `src/lib/domain/notification-view.ts` | קטגוריית התראה, תווית קיבוץ, קישור יעד, איתור חנות, `isNotificationVisible`, `countUnreadNotifications`. |
| `src/lib/domain/watchlist-settings.ts` | טיפוס `WatchSettings`, ברירת מחדל, מיפוי לעמודות `waitlist`, `isStoreMuted`, `passesWatchSettings`. |
| `src/lib/services/personal-preferences.ts` | רק `lastSeenAt` + `notificationTypes`, עם `usePersonalPreferences`. |

`src/app/dashboard/page.tsx` ירד מ־1,386 שורות ל־~422: נשארו מעטפת, לשוניות, הודעות feedback/error והגדרות.

### שמירה על התנהגות
- לשונית "בית" **נשארת mounted** ומוסתרת עם `hidden={tab !== "home"}`. כך סינון החנויות, הגדרות החנות הפתוחות וסימון הביקור ממשיכים להישמר בין מעברי לשוניות, כמו לפני הפיצול.
- הוסרו castים מיותרים (`store as Store`), הוסרה פונקציית עטיפה מיותרת, ו-`benefitUrgency` / `isBirthMonthRelevant` / `URGENCY_ORDER` הפכו פנימיים למודול.

---

## 7. שלב ה' — הגדרות מעקב מסונכרנות לשרת

### מיגרציה: `supabase/migrations/0014_waitlist_watch_settings.sql`
מוסיפה ל-`public.waitlist`:
```sql
min_discount_percent NUMERIC(5,2) CHECK (0..100)
only_verified BOOLEAN NOT NULL DEFAULT FALSE
muted_until TIMESTAMPTZ
```
ומעדכנת את `notify_waitlist_on_active_benefit` כך שיכבד:
- `muted_until > NOW()` → לא שולחים.
- `only_verified` ואין הטבה מאומתת זמינה → לא שולחים.
- `min_discount_percent` בחנות `percentage` וההנחה נמוכה מהרף → לא שולחים.
- הדייג'סט ל-24 שעות (`notified_at`) וכיבוד `notification_preferences.in_app_enabled` נשמרו.
- שים לב לטיפוס ה-enum: `public.benefit_discount_type` (לא `benefit_type`).

### שכבת נתונים: `src/lib/data/app-context.tsx`
- `waitlistSettings: Record<string, WatchSettings>` ברמת ה-context ובמצב הנשמר.
- טעינת Supabase שולפת `store_id, min_discount_percent, only_verified, muted_until` ובונה גם את המפה.
- `toggleWaitlist` יוצר רשומה עם ברירות מחדל ומוחק הגדרות בהסרה.
- `updateWaitlistSettings(storeId, patch)` — upsert ל-`waitlist` עם `onConflict: "user_id,store_id"` + עדכון אופטימי ב-state.
- הגירת נתוני localStorage ותיקים: `waitlistSettings: parsed.waitlistSettings ?? {}`.

### ממשק
`DashboardHome` ו-`WatchSettingsEditor` קוראים/כותבים דרך ה-context, וכל הסינון (feed, סטטוס מושתק, מרכז התראות, מונה הלשונית) משתמש בהגדרות מהשרת.

**החלת המיגרציה:** להריץ את `0014` (וגם `0013` אם טרם הורצה) ב-Supabase לפני ההרצה. אין שינוי RLS: ל-`waitlist_owner` כבר יש `FOR ALL` לבעל הרשומה.

---

## 8. כללים והחלטות שכדאי לשמור

- **לא לגעת בלוגיקת הליבה** אלא אם התבקש במפורש: `src/lib/data/app-context.tsx` (מעבר לחיבורים שתוארו), `src/lib/domain/state-machine.ts`, `src/lib/domain/legality-gate.ts`, `src/lib/domain/eligibility-window.ts`, מיגרציות קיימות, `src/lib/data/seed-stores.ts`.
- **שער החוקיות הוא קובע:** אין להציג הטבה או לאפשר בקשה בחנות ש-`canAcceptRequests` שלה false.
- **פרטיות:** מציגים כינויים בלבד; לא מוסיפים חשיפה של פרטים אישיים. הודעות אישיות לא נשמרות ב-localStorage.
- **RTL ועברית:** כל טקסט חדש בעברית ובמבנה RTL. מספרים/תאריכים בפורמט הקיים.
- **עיצוב:** פלטת לבנדר/חמאה, מחלקות `clay-card` / `clay-btn-primary` / `clay-btn-butter`, וצבעי `#4b2e83`, `#efe7fe`, `#fef6d8`, `#faf7ff`. להיצמד לסגנון הקיים ולא להוסיף ספריות UI.
- **פחות הוא יותר:** אם אפשר להסתיר מאחורי `details` או כפתור — עדיף על הוספת מסך/לשונית.
- **אפס תלויות חדשות** ללא צורך מוצדק.

---

## 9. מפת קבצים מהירה

```
src/app/dashboard/page.tsx                 מעטפת האזור האישי (4 לשוניות, הגדרות, feedback)
src/components/dashboard/
  DashboardHome.tsx                        לשונית בית
  RequestsPanel.tsx                        לשונית בקשות
  BenefitsPanel.tsx                        לשונית ההטבות שלי
  WatchSettingsEditor.tsx                  הגדרות מעקב לחנות
src/lib/domain/
  personal-feed.ts                         מיון/קיבוץ/סטטוס/הצעות/תזכורות
  notification-view.ts                     קטגוריות, קיבוץ, קישורים, סינון ומונה
  watchlist-settings.ts                    WatchSettings + מיפוי לעמודות waitlist
src/lib/services/
  personal-preferences.ts                  lastSeenAt + notificationTypes
  browser-notifications.ts                 הרשאות + Service Worker + showNotification
public/sw.js                               Service Worker להתראות ולניווט בלחיצה
supabase/migrations/0013_waitlist_digest_and_cooldown.sql
supabase/migrations/0014_waitlist_watch_settings.sql
```

---

## 10. מלכודות ידועות

1. **`next build` בזמן `next dev`** — הורס את `.next`. לעצור, למחוק, להריץ מחדש (ראו סעיף 2).
2. **`notification_preferences`** — נכתבת רק כאשר מתגי הסוג משתנים; `email_enabled` תמיד `false` בכוונה.
3. **הגדרות מעקב בדפדפן מלפני המיגרציה** — לא מועברות; ברירת מחדל חדשה. מקור האמת הוא `waitlist`.
4. **התראות דפדפן** — דורשות הרשאה, ופועלות רק כשהאתר פתוח. אין push ברקע ואין מייל.
5. **`localStorage`** — מפתחות: `birthday_gift_il_state_v1` (מצב דמו), `birthday_gift_il_personal_v1:<userId>` (ביקור + סוגי התראות).
6. **אזהרת lint קיימת** ב-`app-context.tsx` על `currentUser.display_name` בתלות של effect ה-Realtime — לא קשורה לשינויים כאן.
7. **מצב Supabase** — האזור האישי מציג מסך התחברות ללא session; אין נתוני דמו.

---

## 11. בדיקות שבוצעו לאחר השינוי האחרון

- `npm run typecheck` — עבר.
- `npx eslint` על הדשבורד, הרכיבים, `lib/domain`, `lib/services` ו-`app-context` — 0 שגיאות, אזהרה קיימת אחת ב-`app-context`.
- `npm run build` — עבר (static export).
- שרת פיתוח על פורט 3006: `/`, `/dashboard/`, `/stores/` — 200.
- **לא בוצע:** התחברות אמיתית, כתיבה בפועל ל-`waitlist` מול Supabase, והרצת המיגרציות על מסד נתונים. אלו נדרשים לפני עלייה לאוויר.
