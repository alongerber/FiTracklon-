// ════════════════════════════════════════════════════════════════════
// 14-tips.jsx — Tips library + tip-of-the-day widget
// ════════════════════════════════════════════════════════════════════

const TIPS = [
  // ─── Weight fluctuation & scale literacy ──────────────────────────
  {
    id: 'scale_fluctuation_shabbat',
    category: 'scale',
    title: 'מה שאתה רואה בבוקר שבת הוא לא שומן',
    body: 'ה-2-3 ק״ג שעלו אחרי ארוחת שישי הם מים, מלח ופחמימות שאגורים בשרירים. שומן לא נבנה ברבע יום — מתמטית בלתי אפשרי. בשבת בצהריים תתעלם מהנתון היומי, תסתכל על ממוצע 7 ימים בגרף. זה מה שאמיתי.',
  },
  {
    id: 'water_weight_sodium',
    category: 'scale',
    title: 'גרם מלח אחד אוגר 100 גרם מים',
    body: 'ארוחת סושי, פיצה, או מרק מסעדה יכולה להכיל 3-5 גרם מלח — 300-500 גרם של משקל מים שיוסרו תוך 48 שעות. אם ראית קפיצה של חצי ק״ג בין יום ליום, בדוק מה אכלת — כמעט תמיד זה מלח, לא שומן.',
  },
  {
    id: 'weigh_same_time',
    category: 'scale',
    title: 'תשקול באותו זמן, באותו מצב',
    body: 'הגוף יכול לשנות 1.5 ק״ג בין בוקר לערב. בוקר אחרי שירותים ולפני ארוחה זה הנקודה היציבה ביותר. אם אתה שוקל בערב לפעמים ובוקר לפעמים, הגרף שלך יראה רעש שאין לו שום משמעות.',
  },
  {
    id: 'plateau_is_normal',
    category: 'scale',
    title: 'שבוע-שבועיים תקוע זה לא plateau אמיתי',
    body: 'בדיאטה, שומן יורד בקצב יציב, אבל משקל המים תנודתי. אפשר לעשות 2-3 שבועות בלי שינוי בסקייל ועדיין להוריד 1 ק״ג שומן. ההגדרה האמיתית של plateau: 3+ שבועות רצופים של יציבות תוך שמירה על גירעון קלורי עקבי. קודם לכן זה רעש.',
  },

  // ─── Protein & nutrition facts ────────────────────────────────────
  {
    id: 'protein_ceiling',
    category: 'nutrition',
    title: 'חלבון מעל 2 גרם לק״ג זה בזבוז כסף',
    body: 'לגוף שלך יש תקרת ניצול. 1.6 גרם לק״ג משקל גוף = שיא אמיתי בדיאטה (לשמירה על מסת שריר). מעבר לזה — הגוף ממיר את העודף לאנרגיה או מפריש. אם אתה שותה שייק חלבון 50 גרם בכדי לעלות מעל 2 ג׳/ק״ג, אתה בעצם מוציא כסף על שתן יקר.',
  },
  {
    id: 'carbs_after_workout',
    category: 'nutrition',
    title: 'החלון האנאבולי הוא מיתוס שיווקי',
    body: 'לאכול חלבון "תוך חצי שעה מהאימון" זה המצאה של חברות תוספים. מחקרים מהעשור האחרון הראו שחלון ההזדמנות הוא 4-6 שעות, לא 30 דקות. אם אכלת חלבון 2-3 שעות לפני האימון, אין שום לחץ אחריו.',
  },
  {
    id: 'calorie_label_accuracy',
    category: 'nutrition',
    title: 'תוויות תזונה בישראל מדויקות עד ±20%',
    body: 'חוק ישראלי מאפשר סטייה של 20% מהמוצהר. "מעדן פרו 90 קלוריות" יכול להיות באמת 72 או 108. זה לא סיבה לייאוש — זה סיבה לא לדייק יותר מדי בספירה. אם המדידה שלך בסטייה של 50 קלוריות ביום, אתה בטווח השגיאה הטבעי של המידע.',
  },
  {
    id: 'protein_before_sleep',
    category: 'nutrition',
    title: 'קוטג׳ בלילה לא עושה אותך שמן',
    body: 'אכילה מאוחרת אינה גורמת לעלייה במשקל יותר מאכילה מוקדמת — אם סך הקלוריות היומי זהה. מחקרים על cottage cheese לפני שינה (חלבון casein איטי) הראו שדווקא השפעה חיובית על שיקום שרירים.',
  },

  // ─── Israeli context ──────────────────────────────────────────────
  {
    id: 'israeli_restaurant_calories',
    category: 'israeli',
    title: 'ארוחה במסעדה ישראלית = 1000-1500 קלוריות',
    body: 'חומוס עם פלאפל ופיתה: 900 ק״ק. שווארמה: 1100. פיצה שלמה משפחתית חצויה: 1200. השוקה של הלוגיקה הקלורית בחוץ אגרסיבית. אם יש לך 3 ארוחות בחוץ בשבוע, החלפת אחת לארוחה ביתית = 1500 קלוריות פחות בשבוע = 9 ק״ג פחות בשנה.',
  },
  {
    id: 'pita_vs_lechem',
    category: 'israeli',
    title: 'פיתה אחת = 2 פרוסות לחם',
    body: 'פיתה ישראלית ממוצעת: 220-250 קלוריות. פרוסת לחם: 100-110. אנשים מתייחסים לפיתה כ"עטיפה" ולא סופרים. לפלאפל בפיתה תוסיף 200 קלוריות על החשבון הזה לבד. לדעת את המספר הופך את ההחלטה למודעת.',
  },
  {
    id: 'leben_vs_yogurt',
    category: 'israeli',
    title: 'לבן 3% = כמעט כפול קלוריות מיוגורט 0%',
    body: 'לבן 3% (150 מ״ל): 110 ק״ק. יוגורט טבעי 0% (150 מ״ל): 60 ק״ק. שניהם עם ~12 ג׳ חלבון. אם אתה אוכל לבן פעמיים ביום, מעבר ליוגורט 0% = חיסכון של 700 ק״ק בשבוע בלי אפילו לשים לב.',
  },
  {
    id: 'coca_zero_science',
    category: 'israeli',
    title: 'קוקה זירו לא מפריעה להרזיה',
    body: 'בלי קלוריות, בלי סוכר. מטא-אנליזות גדולות (2020-2023) לא מצאו קשר סיבתי בין ממתיקים מלאכותיים לעלייה במשקל. מי שמגביל את עצמו למים ולא יכול לעמוד בזה זמן רב — זירו זה כלי שימושי להעביר את התקופה הקשה של הדיאטה.',
  },

  // ─── Psychology & behavior ────────────────────────────────────────
  {
    id: 'tracking_reduces_bingeing',
    category: 'behavior',
    title: 'תיעוד לפני האוכל מוריד את הכמות',
    body: 'מחקרים התנהגותיים: אנשים שמתעדים ארוחה לפני שהם מתחילים לאכול, אוכלים 15-20% פחות מאלה שמתעדים אחרי. הסיבה פסיכולוגית — ברגע שאתה רואה את המספר, אתה מתאים את הכמות. תנסה את זה על מנה אחת השבוע.',
  },
  {
    id: 'all_or_nothing_trap',
    category: 'behavior',
    title: 'יום דיאטה שבור זה לא שבוע שבור',
    body: 'הסטטיסטיקה הקלאסית: 90% מאלה שמפסיקים דיאטה מפסיקים אחרי יום-יומיים של "פגם". הכל-או-כלום הוא הטועה הגדול. אם היית בגירעון 6 ימים ואכלת יותר ביום ה-7, עדיין ירדת באותו שבוע. פספוס לא מצטבר אחורה — רק עוצר את ההתקדמות קדימה.',
  },
  {
    id: 'hunger_vs_habit',
    category: 'behavior',
    title: 'הרעב בשעה 3 בצהריים הוא הרגל, לא פיזיולוגיה',
    body: 'אם ארוחת הצהריים שלך היא ב-14:00, בשעה 15:00 הגוף עדיין מעכל. הרעב שאתה מרגיש ב-15:30 הוא דפוס התנהגותי שנוצר מתקופה של אכילה אחר-הצהריים קודמת. נסה 3 ימים בלי לאכול באמצע — הרעב ייעלם.',
  },
  {
    id: 'social_eating',
    category: 'behavior',
    title: 'אנשים אוכלים 44% יותר בחברה',
    body: 'מחקר קלאסי של דה-קסטרו (1989, שוחזר פעמים רבות): סועדים עם 1 אדם אוכלים +33%, עם 3 אנשים +70%. זו עובדה ביולוגית-חברתית שאי אפשר להתעלם ממנה. אם יש לך 4 ארוחות חברתיות בשבוע, הן אחראיות על 30% מהסטייה שלך. לא לוותר — רק להיות מודע.',
  },

  // ─── Tracking strategy ────────────────────────────────────────────
  {
    id: 'weekly_average_truth',
    category: 'tracking',
    title: 'הממוצע השבועי זה האמת, היום היחיד זה רעש',
    body: 'ההבדל בין יום לא יום יכול להיות ±1.5 ק״ג ממים וחלקים לא מעוכלים. ההבדל בין ממוצע שבוע לשבוע הוא האינדיקטור האמיתי לשומן. במקום לבדוק כל בוקר, תסתכל על הגרף פעם בשבוע.',
  },
  {
    id: 'deficit_math',
    category: 'tracking',
    title: 'החסרה של 500 קלוריות ליום = חצי ק״ג בשבוע',
    body: 'ק״ג שומן = 7700 קלוריות. גירעון של 500 קלוריות יומי = 3500 בשבוע = ~0.45 ק״ג שומן. אם יעד הקצב שלך 1 ק״ג בשבוע, אתה צריך גירעון של ~1100 קלוריות יומי — כמעט בלתי אפשרי לרוב האנשים לקיים יותר מחודש. קצב מציאותי: 0.3-0.6 ק״ג/שב׳.',
  },
  {
    id: 'skip_breakfast_myth',
    category: 'tracking',
    title: 'ארוחת בוקר זה לא "הארוחה הכי חשובה"',
    body: 'האמירה מהשישים (רלוונטית לילדים בגיל צמיחה) הפכה לדוגמה שיווקית של חברות דגנים. למבוגר במעקב משקל, intermittent fasting (אי-אכילה עד 12:00) יכול להיות אסטרטגיה טובה — אם זה נוח לו. המפתח: סך הקלוריות ביום, לא העיתוי.',
  },

  // ─── Myths & bad advice ───────────────────────────────────────────
  {
    id: 'metabolism_slowdown_myth',
    category: 'myths',
    title: 'גיל 30 לא "מאט את חילוף החומרים" בדרמטיות',
    body: 'מחקר 2021 ב-Science הוכיח שחילוף החומרים יחסית יציב בין גיל 20-60 (ירידה של ~1% לעשור). מה שבאמת משתנה: אורח חיים יושבני, איבוד מסת שריר עקב חוסר פעילות. תוסיף אימוני התנגדות פעמיים בשבוע — חילוף החומרים שלך יגבר ב-15-20%.',
  },
  {
    id: 'detox_is_fake',
    category: 'myths',
    title: 'הכבד שלך עושה detox 24/7 בחינם',
    body: 'שייק סלק או "ניקוי רעלים" לא עושים שום דבר שהכבד והכליות לא עושים ממילא, כל יום, לאורך כל החיים. אם תרצה לתמוך במערכות הניקוי — שתה מים, ישן 7 שעות, תפסיק אלכוהול. כל מוצר שמבטיח "detox" מוכר לך מים יקרים במיתולוגיה.',
  },
  {
    id: 'late_eating_myth',
    category: 'myths',
    title: 'לאכול אחרי 20:00 זה לא "אוטומטית שומן"',
    body: 'המיתוס הזה חוזר כל דיאטה מוכרת. הגוף לא יודע את השעה. 2000 קלוריות ב-9:00 הופכות בדיוק כמו 2000 קלוריות ב-22:00. הנתון שחשוב: סך יומי. יש ארגומנטים לגיטימיים להימנע מאכילה מאוחרת (איכות שינה, עיכול), אבל לא "ישיר הופך לשומן".',
  },

  // ─── Strategy & long-term ─────────────────────────────────────────
  {
    id: 'first_3_kg',
    category: 'strategy',
    title: 'ה-3 ק״ג הראשונים יורדים תוך שבועיים',
    body: 'זה 90% מים וגליקוגן. בסוף שבוע 2 הקצב מאט דרמטית (0.3-0.5 ק״ג/שב׳) — זה לא כישלון, זה פיזיולוגיה. אם אתה מצפה להמשיך בקצב של 1.5 ק״ג בשבוע הרביעי, אתה מציב לעצמך מלכודת מוטיבציונית.',
  },
  {
    id: 'maintenance_is_skill',
    category: 'strategy',
    title: 'שמירה על המשקל זה כישור נפרד',
    body: 'רוב המחקרים: 80% מאלה שהורידו 10%+ עולים בחזרה תוך שנתיים. הסיבה: להוריד זה "פרויקט" עם יעד. לשמור זה "אורח חיים" בלי קו-סיום. מי שמצליח לשמור, תיעד לפחות 2-3 פעמים בשבוע גם אחרי שהגיע ליעד. מעקב הוא הכלי, לא גזר הדין.',
  },
  {
    id: 'exercise_for_maintenance',
    category: 'strategy',
    title: 'אימונים לא מורידים משקל — הם שומרים על השריר',
    body: 'הדיאטה מורידה את הק״ג. האימון מחליט כמה מתוכם שומן ולא שריר. בלי אימוני כוח, 25% מהירידה יהיה שריר. עם — 10%. זה הופך את ההבדל בין מי שנראה "רזה" למי שנראה "כחוש-עייף" אחרי ירידה.',
  },
];

const CATEGORY_LABELS = {
  scale: 'מאזניים',
  nutrition: 'תזונה',
  israeli: 'ישראלי',
  behavior: 'התנהגות',
  tracking: 'מעקב',
  myths: 'מיתוסים',
  strategy: 'אסטרטגיה',
};

// ─── Tip of the day: deterministic rotation based on date ───────────
function getTipOfDay(dateISO) {
  // Simple hash: number of days since epoch % tips.length
  const d = new Date(dateISO + 'T00:00:00Z');
  const daysSinceEpoch = Math.floor(d.getTime() / (24 * 3600 * 1000));
  return TIPS[daysSinceEpoch % TIPS.length];
}

// ─── Tip of the day card (for home screen) ──────────────────────────
function TipOfDayCard({ onExpand }) {
  const today = todayISO();
  const tip = getTipOfDay(today);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card padding={14} style={{
      marginBottom: 14, cursor: 'pointer',
      background: `linear-gradient(135deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${T.stroke}`,
    }} onClick={() => onExpand ? onExpand() : setExpanded(v => !v)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `${T.amber}22`, color: T.amber,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TabIcon name="lightbulb" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>
            טיפ היום · {CATEGORY_LABELS[tip.category]}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: expanded ? 8 : 0 }}>
            {tip.title}
          </div>
          {expanded && (
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.7, marginTop: 8 }}>
              {tip.body}
            </div>
          )}
          {!expanded && (
            <div style={{ fontSize: 11, color: T.inkMute, marginTop: 4 }}>לחץ להרחבה</div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Full tips library screen ───────────────────────────────────────
function TipsLibraryScreen({ onClose }) {
  const [filter, setFilter] = React.useState('all');
  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const filtered = filter === 'all' ? TIPS : TIPS.filter(t => t.category === filter);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 800,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>TIPS · ספרייה</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{TIPS.length} תובנות</div>
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ padding: '10px 18px 6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            display: 'inline-block', marginLeft: 6, padding: '6px 12px', fontSize: 12,
            borderRadius: 999, border: `1px solid ${filter === cat ? T.lime : T.stroke}`,
            background: filter === cat ? T.lime : 'transparent',
            color: filter === cat ? T.bg : T.inkSub,
            fontFamily: T.font, cursor: 'pointer', fontWeight: filter === cat ? 700 : 500,
          }}>
            {cat === 'all' ? 'הכל' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}>
        {filtered.map(tip => (
          <Card key={tip.id} padding={14} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>
              {CATEGORY_LABELS[tip.category]}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6, lineHeight: 1.4 }}>
              {tip.title}
            </div>
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.7 }}>
              {tip.body}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
