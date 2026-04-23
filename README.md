# משקך · Mishkach v1.1

אפליקציית PWA למעקב משקל יומי בעברית, עם מודול תזונה מלא ותובנות חכמות באמצעות Claude Opus 4.7.

## חדש ב-v1.1 (Phase 1 · Claude-powered)

### מודול תזונה
- **יעדים אוטומטיים** — חישוב Mifflin-St Jeor לפי גיל/מין/גובה/משקל/קצב יעד. עריכה ידנית אפשרית.
- **3 דרכים להזנת ארוחה:**
  1. **טקסט חופשי** — "שניצל 200 גרם עם אורז וסלט" → Claude מציע ערכי תזונה → אתה מאשר/עורך → שמירה
  2. **תמונה** — ארוחה, תווית תזונה, או מוצר ממותג (מעדני פרו וכו׳). Claude מזהה ומציע ערכים.
  3. **ידנית** — טופס מלא לשליטה מלאה
- **Confidence indicator** — Claude מציין ביטחון נמוך/בינוני/גבוה ומסביר הנחות
- **מעקב יומי** — טבעות לקלוריות + חלבון/פחמימות/שומן, קלוריות נותרות, ממוצע לארוחה
- **ניווט בין ימים** — לראות אחורה, לערוך ארוחות ישנות
- **Swipe-to-delete** על ארוחות

### תובנות חכמות (Opus 4.7)
- **תובנה שבועית** — Claude מנתח 7 ימים אחרונים של משקל + תזונה, כותב 3 פסקאות: מה קרה, דפוס לא ברור, פעולה ספציפית
- **זיהוי Plateau** — אם המשקל יציב 14+ ימים עם שונות <0.5ק״ג, מופיע כרטיס רך עם אפשרות לניתוח
- **Cache מקומי** — כל תובנה נשמרת, תשלם שוב רק אם תלחץ "רענן"

### תשתית Claude API
- **Bring Your Own Key** — המפתח נשמר מקומית בלבד (localStorage). לא מגיע לשום שרת חוץ מ-api.anthropic.com
- **Direct browser access** — header `anthropic-dangerous-direct-browser-access: true`
- **Usage counter** — מעקב $ בזמן אמת: סה״כ, החודש, לפי פיצ׳ר
- **Error handling בעברית** — auth errors, rate limits, overloaded, כשלי רשת
- **ייצוא בלי מפתח** — ה-JSON export מסיר את המפתח אוטומטית לבטיחות

### שיפורי משקל
- **טיפול בחורי נתונים** — כשיש 3+ ימים בלי שקילה, מופיע חיווי "חור של X ימים" בהיסטוריה ומתחת לגרף
- **5 טאבים** — בית, תזונה, + (הזנה), היסטוריה, פרופיל

## עלויות Claude API (Opus 4.7 · $5/$25 per MTok)

שימוש אישי טיפוסי:
- ארוחה מטקסט: ~$0.01
- ארוחה מתמונה: ~$0.03
- תובנה שבועית: ~$0.02
- אבחון plateau: ~$0.03

צפי חודשי בשימוש אישי אינטנסיבי: **$2-5**. בשימוש בינוני: **$0.5-1**.

## התקנה ראשונה

### 1. קבל API key
- גש ל-[console.anthropic.com](https://console.anthropic.com)
- API Keys → Create Key
- העתק (זה נראה כמו `sk-ant-api03-...`)

### 2. פרוס את האפליקציה
כמו קודם — Vercel/GitHub Pages/כל שרת סטאטי עם HTTPS.

### 3. בתוך האפליקציה
- סיים onboarding (עכשיו שואל גם גיל ומין)
- לך לפרופיל → Claude API → הדבק את המפתח
- התחל להוסיף ארוחות

## Deployment

### Vercel
```bash
vercel --prod
```

### GitHub Pages / Netlify / Cloudflare Pages
פשוט להעלות את התיקיה.

### חשוב
HTTPS הכרחי ל-PWA. Vercel/Netlify/GitHub Pages מספקים אוטומטית.

## פרטיות

- כל הנתונים **מקומיים בלבד** — localStorage על המכשיר שלך
- ה-API key **לעולם לא** מגיע לשום שרת חוץ מ-api.anthropic.com
- תמונות נשלחות ל-API לניתוח **ולא נשמרות** במקום אחר (רק thumbnail מקומי קטן)
- export מסיר אוטומטית את ה-API key

## ארכיטקטורה

13 בלוקים של JSX בקובץ אחד (index.html):
1. Theme
2. Store — reducer, Context, stats, nutrition helpers, snapshot builder
3. Charts — SVG
4. UI primitives — TabBar 5 טאבים
5. Onboarding — 4 שלבים כולל גיל/מין
6. Home — V1/V2/V3 + NutritionWidget
7. Log
8. History — גרף, stats, **WeeklyInsightCard**, **PlateauCard**, gap indicators
9. Goal
10. Profile — **ApiConfigDialog**, **UsageDetailsDialog**
11. App root
12. **Claude API wrapper** — callClaude, extractJSON, compressImage, prompt library, usage tracking
13. **Nutrition screen**

## מבנה נתונים ב-localStorage (מורחב)

```json
{
  "version": 1,
  "user": { "ageYears": 38, "gender": "male", ... },
  "goal": { ... },
  "entries": { ... },
  "nutrition": {
    "goals": { "calories": 2100, "protein": 132, "carbs": 210, "fat": 58, "source": "auto" },
    "meals": {
      "2026-04-23": [
        {
          "id": "abc123",
          "description": "מעדן פרו 150 גרם תות",
          "calories": 95, "protein": 15, "carbs": 8, "fat": 0.5,
          "source": "photo_parse",
          "confidence": "high",
          "thumbnail": "data:image/jpeg;base64,...",
          ...
        }
      ]
    }
  },
  "apiConfig": { "key": "sk-ant-...", "model": "claude-opus-4-7" },
  "usage": {
    "allTime": { "requests": 47, "costUSD": 0.22 },
    "byMonth": { "2026-04": { ... } },
    "byFeature": { "nutrition_text": { "count": 30, "costUSD": 0.08 } }
  },
  "insights": {
    "weekly": { "text": "...", "generatedAt": "...", "weekEnding": "..." },
    "plateau": null
  }
}
```

## Roadmap — Phase 2 (הסשן הבא)

- **מודול תמונות גוף** — העלאה, Claude Vision ל-BF%, IndexedDB לאחסון תמונות מלאות
- **Timeline עם wow-factor** — before/after slider drag, השוואה בין תאריכים, גרף משקל/BF% מעל timeline
- **Dynamic goal calibration** — אם הקצב נפל 30%+ למשך 3 שבועות, הצעות לכיול
- **Prompt caching** — חיסכון ~80% על system prompts חוזרים

## רישיון
פרטי.
