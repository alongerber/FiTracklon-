# מִשְׁקַלּוּת — Master Project Brief for Claude Code

## פרויקט

**שם:** מִשְׁקַלּוּת (Mishkalut)
**טאגליין:** "תשקלו לפני שתאכלו. תקנאו בעצמכם של מחר."
**סוג:** PWA (Progressive Web App) למעקב משקל, תזונה ואימון בעברית
**גרסה נוכחית:** v2.4 (פרוסה ב-Vercel, fi-tracklon.vercel.app)
**ריפו:** `alongerber/FiTracklon-` (השם המקורי, לא שונה)
**Vercel project:** `fi-tracklon`
**API proxy:** `api/claude.mjs` ל-Anthropic API

## המשתמש

- **Alon** — יוצר האפליקציה, vibe-coder ללא רקע פורמלי בתכנות
- **משתמש משני:** מירב (שם פלייסהולדר — לא אמיתי, אבל הקוד מתייחס אליו)
- מפתח עם AI (Claude/Cursor) — לא מצפה שהוא יערוך קוד ידנית
- שפת UI עיקרית: עברית. RTL טבעי בכל מקום.

## ארכיטקטורה נוכחית

**Stack:**
- React 18 (UMD מ-cdnjs) — אין build tool, אין npm
- Babel Standalone — מקמפל JSX **בזמן ריצה** בדפדפן ⚠️ זה איטי
- LocalStorage לכל הנתונים — אין backend
- Vercel serverless function ל-API proxy בלבד (ב-`api/claude.mjs`)
- מודל Claude API: `claude-opus-4-7` (latest)

**מבנה קבצים (build script מאחד הכל ל-index.html יחיד):**
```
01-theme.jsx              — צבעים, פונטים, helpers (todayISO, daysBetweenISO)
02-store.jsx              — State + reducer + computeStats
03-charts.jsx             — SVG charts פנימיים
04-ui.jsx                 — רכיבים: Card, Button, Toast, TabBar, TabIcon, EmptyState, SkeletonLines
05-screen-onboarding.jsx  — 6-step onboarding
06-screen-home.jsx        — מסך בית עם velocity gauge
07-screen-log.jsx         — שקילה + persona feedback
08-screen-history.jsx     — היסטוריה + WeeklyInsightCard + PlateauCard
09-screen-goal.jsx        — מסך יעדים
10-screen-profile.jsx     — פרופיל + הגדרות + persona picker
11-app.jsx                — Router (5 tabs)
12-claude-api.jsx         — Claude API integration
13-screen-nutrition.jsx   — תזונה: AI parsing טקסט/תמונה, ארוחות, חיפוש
15-personas.jsx           — 5 פרסונות (polish_mom, salesman, cynic_coach, jealous_friend, neutral)
16-tips-creative.jsx      — 80 טיפים × 5 פרסונות × 2 מגדרים = 800 וריאציות
17-notifications.jsx      — תזכורות מקומיות
18-strings.jsx            — UI strings × 5 personas × 2 genders + sincerity moments
19-errors.jsx             — שגיאות × 5 personas × 2 genders + classifier
20-ai-prompts.jsx         — System prompts לאJSX × 5 personas
21-workout-catalog.jsx    — 47 תרגילים, 9 קבוצות שרירים, 7 סוגים
22-screen-workout.jsx     — מסך אימון מלא + dialogs
build.py                  — מאחד את כל ה-JSX ל-index.html יחיד
sw.js                     — Service Worker (cache: mishkalut-v24)
manifest.webmanifest
api/claude.mjs            — Vercel serverless proxy
```

## פיצ'רים קיימים (v2.4)

### Core
- שקילה יומית (cap של 1 ביום, persona toast)
- היסטוריה + גרפים
- יעדים עם progress bar + ETA
- Onboarding 6 שלבים (כולל בחירת פרסונה + מגדר + שם)

### Persona system
- 5 פרסונות: polish_mom, salesman, cynic_coach, jealous_friend, neutral
- 2 מגדרים (זכר/נקבה) עם הטיות נכונות
- שם המשתמש מוחלף runtime בתוך טקסטים
- 12 personaStr keys מחוברים ל-UI
- Moment of sincerity: כל 20 אינטראקציות הפרסונה "מורידה מסכה"

### AI integration
- Claude API דרך Vercel proxy
- Weekly insight (per persona)
- Plateau analysis (per persona)
- Goal calibration (per persona) ⚠️ הפונקציה קיימת אבל **אין UI trigger**
- Text & image meal parsing

### Tips
- 80 טיפים × 5 פרסונות × 2 מגדרים = 800 וריאציות
- ספריית טיפים, daily tip rotation

### Workout (חדש ב-v2.4)
- 47 תרגילים בעברית, 9 קבוצות שרירים
- 7 סוגי אימון (כוח, אירובי, HIIT, גמישות, ספורט, הליכה, אחר)
- New workout 3-step wizard
- Set/reps/weight tracking
- Workout streak, weekly stats
- Volume calculation
- Custom exercises support

### UX
- Toast עם Undo (5 שניות) למחיקות
- Loading skeletons
- Persona-aware errors (network, timeout, rate limit, etc.)
- ETA edge cases (no_pace, wrong_direction, insufficient_data, reached)
- Streak milestones (2, 3, 5, 7, 10, 14, 30)
- Goal reached celebration
- New low weight celebration
- Missed day banner (1/3/7 days)
- Search מעל ארוחות
- Image compression (1.5MB → 708KB ב-pngquant)

## דרישות ביצועים (קריטי!)

**הבעיה הנוכחית:** הbundle הוא ~625 KB JSX raw, מקומפל ב-Babel Standalone **בזמן ריצה בדפדפן**. בטלפון ישן זה 3-5 שניות מסך לבן בפתיחה.

**הדרישה:**
1. **Pre-compile JSX** ל-JS ב-build time במקום בזמן ריצה
2. **Code splitting** — אם רלוונטי
3. **Lazy loading** של מסכים (workout, history, profile) — לא לטעון הכל בפתיחה
4. **Service Worker** עם strategy של cache-first לקבצים סטטיים
5. **בנצ'מרק יעד:** First Contentful Paint < 1.5 שניות בטלפון בינוני (Galaxy A50, iPhone SE)

**הצעה ארכיטקטונית:**
- להוסיף build step עם esbuild או Bun (יותר מהיר מ-webpack)
- להחזיק את האפליקציה כ-single HTML file (כמו עכשיו) אבל עם JS pre-compiled
- אופציה: לעבור ל-Vite אם זה לא משבר את ה-Vercel deploy

## TODOLIST המלא — מאושר ע"י Alon

### שלב A — תיקונים קטנים → v2.5 (25 דק)
- **A1:** ולידציה משקל קיצוני ב-LogScreen (< 30kg → weight_too_low, > 300kg → weight_too_high). השתמש ב-personaError keys שכבר קיימים.
- **A2:** Goal Calibration UI ב-GoalScreen — כפתור "כייל בעזרת AI" שקורא ל-`generateGoalCalibration()` הקיים. תוצאה ב-Card עם persona text. שמירה ב-`state.insights.calibration`.
- **A3:** ניקוי strings unused (false positives), bump v2.4 → v2.5, SW cache → mishkalut-v25.

### שלב B — Workout V2 → v2.6 (75 דק)
- **B1:** WorkoutVolumeChart — גרף נפח שבועי (kg×reps) ב-30 ימים, bar chart, ב-WorkoutScreen מעל רשימת אימונים.
- **B2:** WorkoutFrequencyChart — גרף תדירות לפי קטגוריה ב-30 ימים, pie או stacked bar.
- **B3:** Personal Records tracker — חישוב per-exercise (max weight, max volume, max reps), תצוגה ב-WorkoutDetailDialog "🏆 שיא חדש!", מסך נפרד "🏆 שיאים אישיים".

### שלב C — Workout מלא → v2.7 (70 דק)
- **C1:** WorkoutSearchDialog — חיפוש על פני כל האימונים (כמו MealSearch).
- **C2:** Routines UI — מסך "הרוטינות שלי", "שמור כרוטינה" אחרי שמירת אימון, "התחל רוטינה" — מעתיק לאימון חדש, מחיקה עם undo.
- **C3:** Workout streak ב-home screen — badge נוסף לצד weight streak (אם >=2).

### שלב D — Export → v2.8 (90 דק)
- **D1:** CSV Export — Weights (date, time, weight_kg, note), BOM ל-Excel עברי.
- **D2:** CSV Export — Meals (date, time, description, calories, protein, carbs, fat, source).
- **D3:** CSV Export — Workouts (workouts.csv + workout_sets.csv).
- **D4:** PDF דוח חודשי — jsPDF מ-CDN. עמוד 1: סיכום מספרי. עמוד 2: גרף משקל. עמוד 3: AI insight.

### שלב E — Polish + Cycle Tracker → v3.0 (90 דק)
- **E1:** Pull-to-refresh בכל המסכים — touchstart/touchmove + spinner animation.
- **E2:** Workout scheduled reminders — בנוסף לתזכורת שקילה, גם תזכורת אימון. ימי שבוע + שעה. persona-aware.
- **E3:** Cycle/calendar awareness — מודעות לחגים, ימי שישי/שבת, סוכות. ב-PMS week (אם cycle tracker פעיל) — feedback רך יותר. אופציונלי לנשים.

### שלב F — Quick-log + Insights → v3.1 (150 דק) ⭐
- **F1:** Voice quick-log — Web Speech API → Claude parser. כפתור מיקרופון ב-AddMealDialog.
- **F2:** Auto-correlations — "ביום שני תמיד יש +500 קלוריות". זיהוי patterns אוטומטי + הצגה ב-WeeklyInsightCard.
- **F3:** What-if scenarios — "אם תוריד 200 ק״ק ביום, תגיע ליעד תוך 6 שבועות במקום 11".

### שלב G — Mental health → v3.2 (150 דק) ⭐ בידול קריטי
- **G1:** Behavior anomaly detection — שקילה 4+ פעמים ביום או < 1000 ק״ק 3 ימים ברצף → צ'אט "האם הכל בסדר?"
- **G2:** Streak forgiveness — 1 freebie לשבוע, יום אחד מדולג לא שובר את הרצף.
- **G3:** No-input weekly check-in — popup קצר ביום ראשון: "השבוע היה: 🟢/🟡/🔴". 3 לחיצות, 0 כתיבה.
- **G4:** Disable calorie numbers (אופציה) — אנשים בריקברי. הסתרת מספרי קלוריות מ-UI.
- **G5:** No-red-numbers — אם אכלת מעל היעד, לא להציג באדום מאיים. אפור.
- **G6:** Resources page — אם זוהה pattern, "אם זה רלוונטי לך, יש תמיכה ב-..."

### שלב H — Workout-in-progress → v3.3 (210 דק)
- **H1:** Workout in progress mode — rest timer (60/90/180), "same as last time", quick-log next set.
- **H2:** PR notifications בזמן אמת — "🏆 שיא חדש!" כששמרת סט שעבר את הקודם.
- **H3:** Plate calculator — "לעשות 80 ק״ג? מוט (20) + 25+10+5 בכל צד".

### שלב I — Body composition → v3.4 (60 דק)
- **I1:** Photo progress tracking — תמונה אחת בשבוע, carousel.
- **I2:** Body measurements — מותניים, חזה, ירכיים. גרף נפרד.
- **I3:** "המשקל יציב, אבל המידה ירדה" insight — שריר vs שומן awareness.

### שלב J — Data ownership → v3.5 (90 דק)
- **J1:** Auto-backup פעם בשבוע ל-Files / Email — לא צריך זיכרון של המשתמש.
- **J2:** Visual "your data is local" indicator + "גיבוי אחרון: לפני יומיים".
- **J3:** Import from MFP/LoseIt CSV.

### שלב K — Engagement → v3.6 (180 דק)
- **K1:** Recovery score — daily morning question (איך ישנת? איך אתה מרגיש?), 1-5 כל אחד.
- **K2:** Habit stacking — ב-onboarding "מתי שותה קפה ראשון?" → "תשקל לפני הקפה".
- **K3:** Weekly push notification — יום ראשון בבוקר, סיכום השבוע. **לא יותר מ-1 פוש בשבוע.**
- **K4:** Calendar awareness — חגים, ימי סופ"ש, סוכות. "בשבוע פסח אכלת 2400 ק״ק. זה לא הרגיל שלך, וזה בסדר."

### שלב L — איכות UI → v3.7 (חדש לפי בקשת Alon)
- **L1:** **החלפת emojis ל-SVG line-icons מודרניים** — האייקונים של פרסונות (👵 💼 🧊 🥺 📊) נראים ילדותיים. לעבור ל-SVG עדינים בסגנון Heroicons / Lucide.
- **L2:** Audit כללי של אייקונים בכל האפליקציה — להחליף emojis ב-SVG עקבי.

### שלב M — ביצועים → v3.8 (קריטי!)
- **M1:** Pre-compile JSX — להעביר מ-Babel Standalone ל-build time. esbuild או Bun.
- **M2:** Lazy loading — מסכים workout/history/profile יטענו on-demand.
- **M3:** Service Worker cache strategy — cache-first לסטטיים, network-first ל-API.
- **M4:** First Contentful Paint < 1.5s benchmark בטלפון בינוני.

---

## תובנות מחקר (כן רלוונטי)

### למה אנשים נוטשים אפליקציות מעקב
- **70% נוטשים בחודש 1** (NCBI scoping review)
- **80% נוטשים אפליקציות food logging תוך שבועות** (Kygo)
- **סיבה #1:** זמן/חיכוך — 37% אמרו "זמן השקעה גבוה מדי"
- **סיבה #2:** דאטה ללא תובנה — "calorie counting without insight"
- **סיבה #3:** השפעה שלילית על mental health — 73% מ-MFP users עם הפרעות אכילה אמרו שזה החמיר

### העקרונות המנחים את הפרויקט
1. **חיכוך נמוך:** רישום חייב להיות ב-3 שניות, לא 30
2. **תובנה > דאטה:** לא להציג מספרים בלי הקשר. תמיד "למה זה קרה"
3. **Mental health awareness:** אופציות הסתרה, no-red-numbers, resources page
4. **Data ownership:** הכל local, easy export, no lock-in
5. **Persona = empathy layer:** הפרסונה לא בידור, היא דרך לתת feedback בלי להכליל

---

## כללי עבודה ל-Claude Code

### מה לעשות
1. **תמיד לבנות + לבדוק** אחרי כל שלב. לא לשבור את האפליקציה.
2. **לעדכן את גרסת ה-SW cache** כל שלב — אחרת המשתמשים יקבלו cache ישן.
3. **לעדכן את מספר הגרסה** ב-`10-screen-profile.jsx`.
4. **לעשות commit + push** אחרי כל שלב, עם summary ברור.
5. **לדווח ל-Alon** מה נעשה, מה לא, ולמה.

### מה לא לעשות
1. **לא לשבור פיצ'רים קיימים** — Persona, AI integration, Workout module — הכל חייב להמשיך לעבוד.
2. **לא להוסיף dependencies** בלי לדון. הפרויקט CDN-only כרגע (חוץ מ-jsPDF ב-D4).
3. **לא לשנות את שמות הקבצים** הקיימים — yikes זה ישבור הכל.
4. **לא להתחיל שלב חדש** לפני שהקודם עובר build + audit.

### שגיאות נפוצות לעקוב
- ה-build script (`build.py`) מאחד את כל ה-JSX לפי סדר. אם יוצרים קובץ חדש, **חייבים להוסיף ל-`JSX_FILES` list ב-build.py**.
- Babel Standalone לא תומך באופטיונל chaining מתקדם — להישאר ב-syntax בסיסי.
- אסור duplicate function names (כל ה-JSX מאוחדים לקובץ יחיד).
- `inputStyle` כבר מוגדר ב-13-screen-nutrition — אם צריך input style באחר, השתמש בשם אחר.

### תהליך commit/push (Claude Code עושה לבד)
```bash
git add .
git commit -m "v2.X — [summary]"
git push origin main
```

### בדיקת build
```bash
cd /path/to/repo
python3 build.py    # מאחד JSX
node syntax_check.js # אופציונלי, בודק Babel תקין
```

---

## הוראות פתיחה — תגיד לי שהבנת

### ⚠️ כלל קריטי: שלב אחד בכל פעם

**אסור לעשות יותר משלב אחד בשיחה.** למה:
- חלון ההקשר של Claude Code מוגבל
- שלבים מאוחרים מסתמכים על קוד שנכתב בשלבים קודמים
- אם תנסה לעשות הכל בבת אחת — תשכח, תדלג, תשבור דברים

**הזרימה הנכונה:**
1. Alon אומר: "תעשה שלב A"
2. אתה: קורא את המסמך, עושה שלב A במלואו, build, commit, push
3. אתה: עוצר. מודיע ש-v2.5 פרוסה. **אל תמשיך לשלב B.**
4. Alon בודק את האפליקציה בטלפון
5. בשיחה חדשה Alon אומר: "תעשה שלב B"
6. חוזר חלילה

**אם Alon אומר "תעשה הכל" — תסביר לו שזה לא יעבוד טוב, ותציע שלב אחד.**

### לפני התחלה (כל שלב חדש)

1. **קרא את ה-README.md** של הריפו
2. **קרא את `index.html`** — תראה את המצב הנוכחי
3. **בדוק את הגרסה ב-`10-screen-profile.jsx`** — להבין איפה אנחנו
4. **הצג Audit קצר:**
   - מה הגרסה הנוכחית?
   - מה השלב הבא לפי ה-TODOLIST?
   - מה אתה הולך לעשות בדיוק?
5. **קבל אישור מ-Alon** לפני שמתחיל לכתוב קוד
6. **תתחיל. אל תקפוץ קדימה.**

### בסיום השלב

1. **Build + verify** — `python3 build.py`, סינטקס תקין
2. **Bump version** ב-`10-screen-profile.jsx`
3. **Bump SW cache** ב-`sw.js`
4. **Commit + push** עם summary ברור
5. **דווח ל-Alon:**
   - מה נעשה
   - מה לא נעשה (וב למה)
   - גודל ה-bundle החדש
   - **"v2.X פרוסה. בדוק ותגיד לי כשאתה מוכן לשלב הבא."**
6. **עצור. אל תמשיך לשלב הבא.**

### חובות (כל שלב)

---

## כתובות חשובות

- **Vercel:** fi-tracklon.vercel.app
- **GitHub:** github.com/alongerber/FiTracklon-
- **Anthropic API docs:** docs.claude.com
- **Anthropic console (API keys):** console.anthropic.com
