# מִשְׁקַלּוּת — Source Code (v3.0)

## מבנה הפרויקט

זה ה-**source** של האפליקציה. כל קבצי ה-JSX מתאחדים, מקומפלים ע״י **esbuild**, ונכתבים ל-`index.html` יחיד בשורש הריפו (זה מה ש-Vercel מגיש) דרך `build.py`.

## דרישות (חד-פעמי בכל מחשב פיתוח)

- **Python 3** — להרצת `build.py`
- **Node.js 18+** — esbuild רץ על Node
- **esbuild** — מותקן מקומית בתיקיית ה-source דרך npm:

```bash
cd mishkach-pwa-src
npm install
```

זה יוצר `node_modules/` בתוך `mishkach-pwa-src/` (כ-10MB). התיקייה ב-`.gitignore` ולא נכנסת ל-commits.

## איך לבנות

```bash
python3 mishkach-pwa-src/build.py
```

זה:
1. מאחד את כל ה-JSX לקובץ זמני
2. מריץ esbuild → minified JS עם target=es2020 + JSX→`React.createElement`
3. עוטף ב-HTML template (ללא Babel runtime)
4. כותב את התוצאה ל-`index.html` בשורש הריפו
5. מעתיק `sw.js`, `manifest.webmanifest`, אייקונים, ו-`api/claude.mjs`

ניתן להריץ מכל מקום — הסקריפט מוצא את עצמו דרך `__file__`.

## ארכיטקטורת הביצועים (v3.0)

לפני v3.0 האפליקציה הייתה משלחת JSX raw + Babel Standalone (~280KB) ל-CDN, והדפדפן היה מקמפל JSX בזמן ריצה (2-4 שניות מסך לבן בטלפון בינוני).

מ-v3.0:
- **esbuild מקמפל ב-build time** — אין JSX בדפדפן
- **אין Babel runtime** — נחסכים ~280KB CDN download + ~80KB gzipped
- **`index.html` מ-959KB ל-708KB raw**, וכ-171KB gzipped (Vercel דוחס בtransport)
- **FCP** משתפר מ-~3-5 שניות ל-~0.5-1.5 שניות בטלפון בינוני

## סדר הקבצים (חשוב לטעינה)

```
01-theme.jsx              — צבעים, פונטים, helpers
02-store.jsx              — State + reducer + computeStats + reportPrefs + workoutReminder
03-charts.jsx             — SVG charts פנימיים (כולל WorkoutVolumeChart, WorkoutFrequencyChart)
04-ui.jsx                 — רכיבים: Card, Button, Toast, TabBar, PullToRefresh, etc.
05-screen-onboarding.jsx  — 6-step onboarding
06-screen-home.jsx        — מסך בית (V1/V2/V3 + WorkoutStreakBadge)
07-screen-log.jsx         — שקילה
08-screen-history.jsx     — היסטוריה
09-screen-goal.jsx        — מסך יעדים + GoalCalibrationCard
10-screen-profile.jsx     — פרופיל
11-app.jsx                — Router (מוצב אחרון בbuild)
12-claude-api.jsx         — Claude API + generateReportInsights
13-screen-nutrition.jsx   — תזונה + AI parsing + search
14-tips.jsx               — (DEPRECATED — לא בשימוש, נשאר ל-reference)
15-personas.jsx           — 5 פרסונות
16-tips-creative.jsx      — 80 טיפים × 5 × 2 = 800 וריאציות
17-notifications.jsx      — תזכורות (שקילה + אימון)
18-strings.jsx            — UI strings × persona × gender + interpolateVars
19-errors.jsx             — שגיאות + classifier
20-ai-prompts.jsx         — System prompts ל-AI + REPORT_INSIGHTS_SYSTEM_PROMPT
21-workout-catalog.jsx    — 47 תרגילים + PR helpers
22-screen-workout.jsx     — מסך אימון + Search + Routines + PRs
23-screen-report.jsx      — דוח אישי AI (PDF + WhatsApp)
```

## חוקים

1. **אסור duplicate function names** — הכל מתאחד לקובץ יחיד
2. **כשמוסיפים קובץ חדש** — חייב להוסיף ל-`JSX_FILES` ב-`build.py`
3. **`14-tips.jsx`** הוצא מ-build (deprecated, נשאר רק כ-reference)
4. **JSX → `React.createElement`** — esbuild עושה את זה אוטומטית עם הflags ב-`build.py`. אסור `<>` JSX Fragment בלי שיהיה `React.Fragment` בסקופ.
5. **שימוש ב-`React`** — הוא גלובלי מה-UMD, לא `import`. כל hook חייב להיות `React.useState`, `React.useEffect`, וכו'.
6. **חידוש cache** — כל שינוי ל-`index.html` חייב bump של `CACHE` ב-`sw.js` (מthe form `mishkalut-vNN`).

## קבצים נלווים

- `sw.js` — Service Worker (cache: `mishkalut-v30`)
- `manifest.webmanifest` — PWA manifest
- `api-claude.js` — שזה אותו דבר כמו `api/claude.mjs` ב-deploy
- `make_icons.py` — סקריפט שיצר את האייקונים
- `*.png` — אייקונים ו-splash screens (כבר דחוסים ב-pngquant)
- `package.json` + `package-lock.json` — רק עבור esbuild (devDependency)
- `node_modules/` — נוצר ע״י `npm install`, ב-`.gitignore`

## גרסה נוכחית

**v3.0** — Pre-compile JSX with esbuild, remove Babel runtime
