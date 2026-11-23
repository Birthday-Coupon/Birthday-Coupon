# תוסף כרום וסקריפט Tampermonkey — מתנת יום הולדת

## 1. התקנת סקריפט Tampermonkey (30 שניות)
1. התקן את התוסף **Tampermonkey** בדפדפן Chrome / Edge.
2. פתח את לוח הבקרה של Tampermonkey → **Create a new script** (`+`).
3. העתק והדבק את תוכן הקובץ `tampermonkey/birthday-coupon-helper.user.js` ולחץ **Save (Ctrl+S)**.
4. היכנס לאחת החנויות במאגר (למשל `https://www.vans.co.il` או `https://www.originals.co.il`) — הכרטיס הצף יקפוץ אוטומטית בפינת המסך!

## 2. התקנת תוסף Chrome / Edge (Manifest V3)
1. פתח בדפדפן את הכתובת `chrome://extensions/`.
2. הפעל למעלה בצד ימין **Developer mode (מצב מפתח)**.
3. לחץ **Load unpacked (טען תוסף לא ארוז)** ובחר את התיקייה `browser-extension/chrome-extension`.
4. התוסף פעיל מיד — כולל אייקון חיפוש מהיר בסרגל הדפדפן, Badge עם מספר ההטבות הפעילות בחנות הנוכחית, וכרטיס צף מבודד ב-Shadow DOM!

## פרטיות
התוסף והסקריפט מושכים אחת ל-30 דקות רשימה ציבורית קלה של דומיינים ומספר הטבות פעילות (`get_extension_store_feed`) ומבצעים את בדיקת הדומיין **100% מקומית בדפדפן**. היסטוריית הגלישה לעולם אינה נשלחת לשרת.
