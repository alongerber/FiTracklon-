# מִשְׁקַלּוּת — Source Code (v2.4)

## מבנה הפרויקט

זה ה-**source** של האפליקציה. כל קבצי ה-JSX מתאחדים ל-`index.html` יחיד דרך `build.py`.

## איך לבנות

```bash
python3 build.py
```

זה יוצר את הפלט ב-`/mnt/user-data/outputs/mishkach-pwa/index.html`.

## סדר הקבצים (חשוב לטעינה)

```
01-theme.jsx              — צבעים, פונטים, helpers
02-store.jsx              — State + reducer + computeStats
03-charts.jsx             — SVG charts פנימיים
04-ui.jsx                 — רכיבים: Card, Button, Toast, TabBar, etc.
05-screen-onboarding.jsx  — 6-step onboarding
06-screen-home.jsx        — מסך בית
07-screen-log.jsx         — שקילה
08-screen-history.jsx     — היסטוריה
09-screen-goal.jsx        — מסך יעדים
10-screen-profile.jsx     — פרופיל
11-app.jsx                — Router (מוצב אחרון בbuild)
12-claude-api.jsx         — Claude API
13-screen-nutrition.jsx   — תזונה + AI parsing + search
14-tips.jsx               — (DEPRECATED — לא בשימוש, נשאר ל-reference)
15-personas.jsx           — 5 פרסונות
16-tips-creative.jsx      — 80 טיפים × 5 × 2 = 800 וריאציות
17-notifications.jsx      — תזכורות
18-strings.jsx            — UI strings × persona × gender
19-errors.jsx             — שגיאות + classifier
20-ai-prompts.jsx         — System prompts ל-AI
21-workout-catalog.jsx    — 47 תרגילים
22-screen-workout.jsx     — מסך אימון
```

## חוקים

1. **אסור duplicate function names** — הכל מתאחד לקובץ יחיד
2. **כשמוסיפים קובץ חדש** — חייב להוסיף ל-`JSX_FILES` ב-`build.py`
3. **`14-tips.jsx`** הוצא מ-build (deprecated, נשאר רק כ-reference)

## קבצים נלווים

- `sw.js` — Service Worker (cache: mishkalut-v24)
- `manifest.webmanifest` — PWA manifest
- `api-claude.js` — שזה אותו דבר כמו `api/claude.mjs` ב-deploy
- `make_icons.py` — סקריפט שיצר את האייקונים
- `*.png` — אייקונים ו-splash screens (כבר דחוסים ב-pngquant)

## גרסה נוכחית

**v2.4** — Workout module + persona improvements
