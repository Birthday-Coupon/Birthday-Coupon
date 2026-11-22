-- =============================================================================
-- Birthday Gift IL - Additional 15 Stores Seed (from רשימת חנויות נוספת.md)
-- =============================================================================

INSERT INTO public.categories (slug, name_he, icon, sort_order) VALUES
  ('beauty', 'קוסמטיקה וטיפוח', 'sparkles', 6),
  ('food', 'אוכל ובתי קפה', 'utensils', 7),
  ('jewelry', 'תכשיטים ואקססוריז', 'gem', 8),
  ('judaica', 'יודאיקה ומתנות', 'gift', 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.stores (
  slug, name, name_he, category_id, website_url,
  benefit_summary, benefit_type, discount_value,
  min_order_agorot, max_order_agorot,
  default_window_type, default_window_days_before, default_window_days_after,
  club_name, club_fee_info, redemption_method,
  is_online_eligible, is_one_time_per_member, valid_on_sale,
  requires_matching_recipient_name, shipping_countries, purchase_limits,
  legality_status, legality_conditions,
  terms_url, terms_quoted_clause,
  last_reviewed_at, next_review_at,
  affiliate_network, affiliate_commission, suitability_rank
) VALUES
(
  'il-makiage', 'IL MAKIAGE', 'איל מקיאג׳ (IL MAKIAGE)',
  (SELECT id FROM public.categories WHERE slug = 'beauty'),
  'https://www.ilmakiage.co.il',
  '35% הנחה (רגיל) או 40% הנחה (מועדון סודי) בחודש יום ההולדת בסניפים ובאתר.',
  'percentage', '35%–40% הנחה',
  0, NULL, 'month', 0, 0,
  'מועדון IL MAKIAGE', 'חינם',
  'קוד הנחה אישי באימייל / SMS (אונליין ללא צורך בנוכחות)',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'רכישה בחודש יום ההולדת.',
  'conditional', 'קוד הנחה אישי למימוש אונליין או בסניפים.',
  'https://www.ilmakiage.co.il', '35%–40% הנחה בחודש יום ההולדת באמצעות קוד במייל/SMS (Keepon 11.2026).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 10
),
(
  'adidas-adiclub', 'Adidas (adiClub)', 'אדידס (Adidas adiClub)',
  (SELECT id FROM public.categories WHERE slug = 'sport'),
  'https://www.adidas.co.il',
  '20% הנחה בחודש יום ההולדת לחברי מועדון adiClub באתר ובחנויות.',
  'percentage', '20% הנחה',
  0, NULL, 'month', 0, 0,
  'adiClub', 'חינם',
  'מופעל אוטומטית בחשבון המשתמש באתר ובחנויות',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL', 'GLOBAL'], 'רכישה אחת בחודש יום ההולדת.',
  'allowed', 'הנחה אוטומטית בחשבון adiClub באתר.',
  'https://www.adidas.co.il', '20% הנחה בחודש יום ההולדת לחברי adiClub — מופעל אוטומטית בחשבון.',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', 'Adidas Global Affiliate', 'משתנה', 11
),
(
  'nimrod-stars', 'Nimrod STARS', 'נעלי נמרוד (Nimrod STARS)',
  (SELECT id FROM public.categories WHERE slug = 'kids'),
  'https://www.nimrod.co.il',
  '30% הנחה על רכישה אחת (עד 100 ₪ הנחה) בחודש יום ההולדת; לבני נוער 15% (עד 50 ₪).',
  'percentage', '30% (עד 100 ₪)',
  0, NULL, 'month', 0, 0,
  'Nimrod STARS', 'חינם / מועדון לקוחות',
  'ללא קוד — נבדק אוטומטית בחשבון המועדון באתר ובסניפים',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'עד 100 ₪ הנחה (נוער עד 50 ₪), רכישה אחת.',
  'conditional', 'מימוש באתר ובסניפים דרך חשבון חבר המועדון.',
  'https://www.nimrod.co.il', '30% הנחה על רכישה אחת בחודש יום ההולדת (עד 100 ₪).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 12
),
(
  'paradise-jewelry', 'PARADISE Jewelry', 'PARADISE (תכשיטים)',
  (SELECT id FROM public.categories WHERE slug = 'jewelry'),
  'https://www.paradise-jewelry.co.il',
  '15% הנחה בחודש יום ההולדת לחברי מועדון הלקוחות באתר.',
  'percentage', '15% הנחה',
  0, NULL, 'month', 0, 0,
  'מועדון PARADISE', 'חינם',
  'ללא קוד — מימוש אוטומטי בחשבון באתר',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'בחודש יום ההולדת לפי תקנון האתר.',
  'conditional', 'הטבה אישית הממומשת בחשבון המשתמש באתר.',
  'https://www.paradise-jewelry.co.il', '15% הנחה בחודש יום הולדת למועדון הלקוחות (תקנון 09.2026).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 13
),
(
  'avishag-arbel', 'Avishag Arbel', 'אבישג ארבל',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.avishagarbel.co.il',
  '15% הנחה על פריטים במחיר מלא בחודש יום ההולדת (פעם בשנה) באתר ובחנויות.',
  'percentage', '15% הנחה',
  0, NULL, 'month', 0, 0,
  'מועדון אבישג ארבל', 'חינם',
  'ללא קוד — מימוש אוטומטי בחשבון',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'פריטים במחיר מלא בלבד, פעם בשנה.',
  'conditional', 'מימוש אוטומטי בחשבון באתר ובחנויות על מחיר מלא.',
  'https://www.avishagarbel.co.il', '15% הנחה על פריטים במחיר מלא בחודש יום ההולדת.',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 14
),
(
  'pretty-ballerinas', 'Pretty Ballerinas', 'Pretty Ballerinas',
  (SELECT id FROM public.categories WHERE slug = 'footwear'),
  'https://www.prettyballerinas.co.il',
  '15% הנחה על רכישות בחודש יום ההולדת לחברי מועדון Pretty Club באתר ובחנויות.',
  'percentage', '15% הנחה',
  0, NULL, 'month', 0, 0,
  'Pretty Club', 'חינם',
  'זיהוי פרטי מועדון / קוד במערכת',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'בחודש יום ההולדת לחברי Pretty Club.',
  'conditional', 'הטבה אישית לחברי Pretty Club באתר ובחנויות.',
  'https://www.prettyballerinas.co.il', '15% הנחה על הרכישות בחודש יום ההולדת למועדון Pretty Club.',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 15
),
(
  'hitkadasht', 'Hitkadasht', 'התקדשת (יודאיקה)',
  (SELECT id FROM public.categories WHERE slug = 'judaica'),
  'https://www.hitkadasht.co.il',
  'קופון מתנת יום הולדת של 49 ₪ בקנייה מעל 200 ₪ באתר לחברי המועדון.',
  'fixed_amount', '49 ₪ (מעל 200 ₪)',
  20000, NULL, 'month', 0, 0,
  'מועדון התקדשת', 'חינם',
  'קופון הנחה במייל למימוש באתר (כולל משלוח)',
  TRUE, TRUE, FALSE, FALSE, ARRAY['IL'], 'בקנייה מעל 200 ₪.',
  'conditional', 'קופון אישי במייל למימוש בהזמנה באתר.',
  'https://www.hitkadasht.co.il', 'קופון של 49 ₪ בקנייה מעל 200 ₪ לחברי המועדון.',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 16
),
(
  'hod-vehadar', 'Hod VeHadar', 'הוד והדר (תשמישי קודש)',
  (SELECT id FROM public.categories WHERE slug = 'judaica'),
  'https://www.hodvehadar.co.il',
  'קופון (זיכוי) של 35 ₪ בקנייה מעל 250 ₪ במהלך חודש יום ההולדת באתר ובסניף.',
  'fixed_amount', '35 ₪ (מעל 250 ₪)',
  25000, NULL, 'month', 0, 0,
  'מועדון הוד והדר', 'חינם',
  'זיכוי אוטומטי בחשבון המועדון',
  TRUE, TRUE, FALSE, TRUE, ARRAY['IL'], 'בקנייה מעל 250 ₪ בחודש יום ההולדת.',
  'conditional', 'זיכוי אישי בחשבון המועדון באתר או בסניף.',
  'https://www.hodvehadar.co.il', 'זיכוי של 35 ₪ בקנייה מעל 250 ₪ במהלך חודש יום ההולדת.',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 17
),
(
  'mcdonalds-il', 'McDonald’s Israel', 'מקדונלד׳ס (McDonald’s)',
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'https://www.mcdonalds.co.il',
  'מתנה בחינם לחברי מועדון הלקוחות בחודש יום ההולדת דרך אפליקציית מקדונלד׳ס.',
  'gift', 'מתנה בחינם באפליקציה',
  0, NULL, 'month', 0, 0,
  'מועדון מקדונלד׳ס', 'חינם',
  'קוד / טוקן באפליקציית מקדונלד׳ס (ניתן לפדות בהזמנה)',
  TRUE, TRUE, NULL, FALSE, ARRAY['IL'], 'מתנה חד-פעמית בחודש יום ההולדת באפליקציה.',
  'conditional', 'קוד/טוקן באפליקציה למימוש בהזמנה.',
  'https://www.mcdonalds.co.il', 'מתנה בחינם למועדון הלקוחות בחודש יום ההולדת באפליקציה (Keepon).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 18
),
(
  'golf-steimatzky', 'Golf / Steimatzky (W Card)', 'גולף / סטימצקי (כרטיס W)',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.golfco.co.il',
  '20% הנחה ברכישה בכרטיס מועדון W בחנויות גולף וסטימצקי (עד סכום 1,000 ₪).',
  'percentage', '20% (עד 1,000 ₪)',
  0, 100000, 'month', 0, 0,
  'כרטיס מועדון W', 'מועדון לקוחות',
  'ללא קוד — חובה תשלום בכרטיס W',
  FALSE, TRUE, NULL, TRUE, ARRAY['IL'], 'עד 1,000 ₪, תשלום בכרטיס W בלבד.',
  'conditional', 'דורש תשלום בכרטיס מועדון W.',
  'https://www.golfco.co.il', '20% הנחה ברכישה בכרטיס מועדון W עד 1,000 ₪ (Keepon 09.2026).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 19
),
(
  'fox-terminal-x', 'Fox / Terminal X (Dream Card)', 'פוקס / טרמינל X (Dream Card)',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.terminalx.com',
  '30% הנחה על קנייה אחת בחודש יום ההולדת (עד הנחה מקסימלית ~150 ₪) בחנויות הקבוצה ובאתר.',
  'percentage', '30% (עד ~150 ₪)',
  0, NULL, 'month', 0, 0,
  'Dream Card', 'דמי הצטרפות חד-פעמיים',
  'ללא קוד — מזוהה לפי ת״ז / חשבון מועדון',
  TRUE, TRUE, FALSE, TRUE, ARRAY['IL'], 'קנייה אחת בחודש יום ההולדת, עד הנחה ~150 ₪.',
  'prohibited', 'הטבה אישית מבוססת ת״ז (בחנויות נדרשת הצגת ת״ז).',
  'https://www.dreamcard.co.il', '30% הנחה על קנייה אחת בחודש היומולדת עד ~150 ₪; אישי מבוסס ת״ז (Keepon 11.2026).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 20
),
(
  'dreamcard-vip', 'DreamCard VIP (Max)', 'DreamCard VIP (מקס)',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.dreamcard.co.il',
  '30% הנחה בחודש יום ההולדת (עד 300 ₪ הנחה) בתשלום בכרטיס DreamCard VIP.',
  'percentage', '30% (עד 300 ₪)',
  0, NULL, 'month', 0, 0,
  'DreamCard VIP (Max)', 'כרטיס אשראי מועדון',
  'ללא קוד — תשלום בכרטיס VIP בלבד',
  TRUE, TRUE, FALSE, TRUE, ARRAY['IL'], 'עד 300 ₪ הנחה, תשלום בכרטיס VIP בלבד.',
  'prohibited', 'הטבה אישית המותנית בתשלום בכרטיס DreamCard VIP.',
  'https://www.dreamcard.co.il', '30% הנחה עד 300 ₪ בתשלום בכרטיס DreamCard VIP (Keepon).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 21
),
(
  'roladin', 'Roladin', 'רולדין (Roladin)',
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'https://www.roladin.co.il',
  'קינוח / מתנת יום הולדת משתנה בחודש יום ההולדת — נשלחת ללקוח ב-SMS למימוש בסניפים.',
  'gift', 'קינוח / מתנה בסניף',
  0, NULL, 'month', 0, 0,
  'מועדון רולדין', 'חינם',
  'קוד / הטבה ב-SMS — הצגת SMS בסניפים בלבד',
  FALSE, TRUE, NULL, TRUE, ARRAY['IL'], 'מימוש פיזי בסניפים בלבד בהצגת SMS.',
  'prohibited', 'מימוש אישי בסניפי הרשת בלבד בהצגת הודעת SMS.',
  'https://www.roladin.co.il', 'קינוח/מתנה משתנה ב-SMS למימוש בסניפים בלבד (Keepon).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 22
),
(
  'h-and-o', 'H&O', 'H&O',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.h-o.co.il',
  'הטבת יום הולדת משתנה הנשלחת ללקוח ב-SMS לחברי המועדון.',
  'gift', 'הטבה משתנה ב-SMS',
  0, NULL, 'month', 0, 0,
  'מועדון H&O', 'חינם / מועדון',
  'קוד / הטבה ב-SMS (הצגת קוד בסניף / אתר)',
  TRUE, TRUE, NULL, TRUE, ARRAY['IL'], 'בהתאם לתקנון המועדון המשתנה.',
  'prohibited', 'הטבה אישית הנשלחת ב-SMS לבעל המועדון.',
  'https://www.h-o.co.il', 'הטבת יום הולדת משתנה ב-SMS לחברי מועדון (Keepon).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 23
),
(
  'castro-cu', 'Castro (CU Club)', 'קסטרו (מועדון CU)',
  (SELECT id FROM public.categories WHERE slug = 'fashion'),
  'https://www.castro.com',
  'הטבת יום הולדת למועדון CU — לפי התקנון ההטבה אינה מובטחת ותלויה בשיקול דעת הרשת.',
  'gift', 'משתנה (לשיקול הרשת)',
  0, NULL, 'month', 0, 0,
  'מועדון CU (קסטרו)', 'מועדון לקוחות',
  'בכפוף להודעת המועדון בחודש יום ההולדת',
  TRUE, TRUE, NULL, TRUE, ARRAY['IL'], 'אין הטבה קבועה מובטחת בתקנון.',
  'unverified', 'לפי תקנון מועדון CU אין תמורה מובטחת וההטבה ניתנת לשיקול דעת הרשת.',
  'https://www.castro.com', 'אין תמורה מובטחת — ההטבה מותנית בשיקול קסטרו (Keepon).',
  '2026-11-22T10:00:00Z', '2027-02-20T10:00:00Z', NULL, NULL, 24
)
ON CONFLICT (slug) DO UPDATE SET
  benefit_summary = EXCLUDED.benefit_summary,
  discount_value = EXCLUDED.discount_value,
  legality_status = EXCLUDED.legality_status,
  legality_conditions = EXCLUDED.legality_conditions,
  terms_quoted_clause = EXCLUDED.terms_quoted_clause,
  updated_at = NOW();

INSERT INTO public.store_terms_reviews (store_id, legality_status, quoted_clause, source_url, notes, reviewed_at)
SELECT id, legality_status, COALESCE(terms_quoted_clause, 'נבדק מול מקור רשמי'), terms_url, 'הוספת מאגר חנויות נוסף (נובמבר 2026)', '2026-11-22T10:00:00Z'
FROM public.stores
WHERE slug IN (
  'il-makiage', 'adidas-adiclub', 'nimrod-stars', 'paradise-jewelry', 'avishag-arbel',
  'pretty-ballerinas', 'hitkadasht', 'hod-vehadar', 'mcdonalds-il', 'golf-steimatzky',
  'fox-terminal-x', 'dreamcard-vip', 'roladin', 'h-and-o', 'castro-cu'
)
ON CONFLICT DO NOTHING;
