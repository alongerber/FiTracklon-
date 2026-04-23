# FiTracklon · v1.3

PWA עברית למעקב משקל, תזונה, ותובנות חכמות מבוססות Claude Opus 4.7 / Sonnet 4.6.

## מה חדש ב-v1.3

### שם חדש: FiTracklon
Fit + Track + Alon. החלפת "משקך" הזמני.

### מצב משותף (Shared API)
אפשרות להריץ את האפליקציה עם **API key יחיד שאתה מממן** ו-**קוד גישה משותף** למשתמשים מהימנים. מוגן ע"י **תקרה שבועית של $2** שאוכפת server-side.

שני מצבים:
- **אישי** — כל משתמש מגדיר API key משלו (ברירת מחדל, חסין לחלוטין)
- **משותף** — משתמשים מזינים קוד גישה. התעבורה עוברת דרך Vercel Edge Function שמחזיקה את המפתח ובודקת תקרה

### Tiered Models — אותה איכות, עלות נמוכה יותר
| פיצ'ר | מודל | למה |
|---|---|---|
| ניתוח טקסט (תיאור ארוחה) | Sonnet 4.6 | 40% זול יותר, איכות ~זהה |
| ניתוח תמונות (מוצר/תווית) | Opus 4.7 | וויז'ן הכי טוב, קריטי לזיהוי מוצרים ישראליים |
| תובנה שבועית | Opus 4.7 | הסקה מורכבת חוצה נתונים |
| אבחון plateau | Opus 4.7 | הסקה מורכבת |

### שיפורי UX
- **NumberStepper מואץ** — החזקה ארוכה של + / − מאיצה את השינוי (×3 אחרי 5 tick, ×10 אחרי 12 tick)
- **הקלדה ישירה** — לחיצה על המספר פותחת שדה טקסט עם מקלדת מספרים

---

## Deployment

### אפשרות 1 — מצב אישי (הכי פשוט)

סטאטי לגמרי. שים את התיקיה ב-Vercel/Netlify/GitHub Pages, פותח, מכניס API key בפרופיל, עובד.

```bash
vercel --prod
```

כל משתמש צריך API key משלו. משלם בעצמו.

---

### אפשרות 2 — מצב משותף (קוד אחד לכולם)

דורש 3 שלבים:

#### א. Deploy לתיקיה קבועה
```bash
vercel --prod
```
או push לרפו GitHub ו-Vercel יעדכן אוטומטית.

#### ב. הגדר 2 Environment Variables ב-Vercel
ב-Project Settings → Environment Variables:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | ה-API key שלך (sk-ant-api03-...) |
| `APP_PASSWORD` | קוד הגישה שתשתף עם המשתמשים (למשל 046784654) |

אחרי הוספה, **redeploy** כדי שהמשתנים ייכנסו לתוקף.

#### ג. הפעל Vercel KV לאכיפת תקרה (מומלץ)

ב-Vercel Dashboard → Storage → Create Database → **KV** (by Upstash).

Vercel יוסיף אוטומטית 4 env vars: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`. אין צורך להזין ידנית.

**חשוב:** אם KV לא מופעל — הפונקציה עובדת, אבל בלי אכיפת תקרה. במצב הזה מומלץ להגדיר תקרה חודשית ב-[console.anthropic.com](https://console.anthropic.com) → Settings → Billing → Spend limits ($10/חודש).

#### ד. הגדר את זה בתוך האפליקציה
פרופיל → Claude API → החלף ל-"משותף" → הזן את ה-APP_PASSWORD → שמור.

### מה הפונקציה עושה

`api/claude.js` (Edge Function, אפס npm deps):
1. בודקת header `x-app-password` מול `APP_PASSWORD`
2. בודקת שהתקרה השבועית ($2) לא נחרגה (קריאה ל-Upstash REST API)
3. מעבירה את הבקשה ל-Anthropic עם ה-API key הסודי
4. מחשבת עלות מה-`usage` שחוזר, מעלה במונה ה-KV
5. מחזירה את התשובה + metadata של תקרה (`_weekly_spend`, `_days_until_reset`)

### השבוע מתאפס מתי?
יום שני UTC 00:00 (ISO week). בישראל: בערך 02:00-03:00 בלילה בין ראשון לשני.

### עלויות צפויות (שימוש של 2 אנשים)
- 42 ניתוחי טקסט / שבוע: ~$0.17
- 20 ניתוחי תמונה / שבוע: ~$0.26
- 4 תובנות שבועיות: ~$0.06
- **סה"כ: ~$0.50/שבוע** (בתוך התקרה, עם מרחב נשימה)

אם מגיעים לתקרה — האפליקציה עובדת בלי Claude (הזנה ידנית נשארת זמינה). בתחילת השבוע הבא זה חוזר לעבוד.

---

## מבנה הפרויקט

```
/
├── index.html              # האפליקציה (207KB, JSX inline)
├── manifest.webmanifest
├── sw.js                   # Service worker offline-first
├── icon-*.png
├── api/
│   └── claude.js           # Edge Function (8KB, שירות proxy)
├── vercel.json             # הגדרת runtime edge
└── README.md
```

## פרטיות

- **מצב אישי:** כל הנתונים מקומיים, API key לא עובר לשום שרת חוץ מ-api.anthropic.com.
- **מצב משותף:** הנתונים מקומיים, הקריאות עוברות דרך Vercel (שלך) → Anthropic. הקוד לא נשמר בשרת, רק נבדק. אין לוגים של תוכן.
- Export מסיר אוטומטית API key + קוד גישה.

## אבטחה

**קוד גישה חלש (9 ספרות) מספיק?** — כן, כי:
1. הכתובת של האפליקציה גם חצי-פרטית (לא מפורסמת)
2. תקרת $2/שבוע מגבילה את הנזק אם מישהו יברח עם הקוד
3. אפשר להחליף את הקוד בכל עת (עדכון env var ב-Vercel)

**מה אם הקוד דולף?** — שנה את `APP_PASSWORD` ב-Vercel, redeploy, וודא שהמשתמשים שלך מזינים את החדש. ה-API key שלך אף פעם לא היה חשוף.

## Roadmap — Phase 2

- **מודול תמונות גוף** — העלאה, Claude Vision ל-BF%, timeline עם before/after slider
- **Prompt caching** — חיסכון נוסף ~80% על system prompts חוזרים (1-hour TTL)
- **Dynamic goal calibration** — notification חכם כשהקצב נופל 30%+ למשך 3+ שבועות

## רישיון
פרטי.
