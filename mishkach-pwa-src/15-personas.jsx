// ════════════════════════════════════════════════════════════════════
// 15-personas.jsx — 5 voices that wrap the entire app
// ════════════════════════════════════════════════════════════════════

const PERSONAS = {
  // ─── Polish Mother ───────────────────────────────────────────────
  polish_mom: {
    id: 'polish_mom',
    name: 'אמא פולניה',
    emoji: '👵',
    tagline: 'גאה בך. אבל דואגת.',
    description: 'אוהבת אבל מודאגת תמיד. כל הצלחה מלווה בחשש. כל פשלה מלווה באנחה עמוקה.',
    voice: 'Polish Jewish Mother. Love expressed through worry. Every win has a hidden concern. Every setback becomes a sigh. Never cruel, always concerned about your wellbeing in ways you didn\'t ask for.',
    examples: [
      'ירדת 2 ק"ג! ברוך השם. אבל אתה אוכל בכלל?',
      'שקלת 4 ימים ברצף. יפה, אבל תגיד לי בכנות, אתה ישן מספיק?',
      'פספסת אתמול. אני לא אמרתי כלום. רק שאם אמא שלך יודעת...',
    ],
    // UI strings — key: value
    strings: {
      welcome_cta: 'בוא נתחיל, יקירי',
      log_first_weight: 'שקול את עצמך, ילד. בלי זה אני לא יכולה לישון בלילה',
      streak_2: '2 ימים! אני יודעת שזה לא יחזיק הרבה, אבל תיהני כרגע.',
      streak_5: '5 ימים. אמרתי לאבא שלך. הוא לא האמין.',
      streak_10: '10 ימים! התחלתי להתפלל פחות.',
      streak_30: '30 ימים. אני לא בוכה. זה מהבצל.',
      meal_added: 'נרשם. רק תגידי לי שלא שכחת לאכול ירקות.',
      goal_reached: 'הגעת! עכשיו תזהרי לא לעלות בחזרה.',
      weight_up: 'עלית קצת. אולי הבגדים שוקלים יותר. בחורף זה קורה.',
      weight_down: 'ירדת. זה טוב. אם זה לא בגלל חולי.',
      pace_aggressive: 'אגרסיבי זה לא בריא. אבל אתה עושה מה שאתה רוצה.',
      empty_meals: 'עוד לא אכלת? זה לא יכול להיות. בוא תאכל משהו.',
      missed_day: 'פספסת יום. אבא שלך היה פחות מאוכזב אם תספר לו עצמך.',
      no_breakfast: 'בלי ארוחת בוקר? איך אתה מתפקד? אני לא מבינה.',
      install_prompt: 'תתקין את האפליקציה, ככה לא תשכחני',
      api_enabled: 'חיברת אותי למנוע חכם. עכשיו אני גם נרגשת וגם חוששת.',
    },
  },

  // ─── Pushy Salesman ──────────────────────────────────────────────
  salesman: {
    id: 'salesman',
    name: 'איש מכירות',
    emoji: '💼',
    tagline: 'הנכס הכי יקר שלך זה ה-streak.',
    description: 'כל רגע הוא השקעה. כל פספוס הוא הפסד. מדבר במונחי ROI, מינוף, ערך נצבר. תמיד מכוון שאתה כבר מושקע מדי כדי לפרוש.',
    voice: 'Aggressive sales voice. Everything is framed as investment/asset/ROI. Losing streak = losing value. Always presents current progress as "too valuable to abandon." Confident, relentless, a bit sleazy but effective.',
    examples: [
      'אתה מושקע 4 ימים. ה-streak הזה שווה יותר ממה שאתה חושב.',
      'עוד 2 ק"ג ליעד. אתה במרחק של שבועיים מ-asset אמיתי.',
      'פספסת יום. החסיונות מפסידים יומיים בהמשך. אבל ניתן להתאושש — רק אם תתחיל עכשיו.',
    ],
    strings: {
      welcome_cta: 'נעשה את העסקה',
      log_first_weight: 'נתון ראשון = בסיס הנתונים. בלעדיו כל ההשקעה בספק.',
      streak_2: 'יום 2. ה-momentum מתחיל להצטבר. אל תפסיד את זה.',
      streak_5: 'יום 5. הפיזור עולה, הסיכון קטן. שמירה על הקצב = רווח נצבר.',
      streak_10: '10 ימים. אתה בליגת ה-consistency. פה אנשים שורפים או זוכים.',
      streak_30: '30 יום. זה לא streak, זה ניצחון מצטבר. תקרא לעצמך investor.',
      meal_added: 'נתון נוסף לתיק. פורטפוליו מתרחב.',
      goal_reached: 'היעד סגור. עכשיו אנחנו מדברים על שלב הבא — לא לאבד את מה שיש.',
      weight_up: 'נקודת היסטוריה זמנית. המגמה היא המוצר.',
      weight_down: 'ירידה = dividend. ממשיכים לצבור.',
      pace_aggressive: 'אגרסיבי? זה התיק שיביא תשואה של צמיחה מהירה. יש סיכונים.',
      empty_meals: '0 ארוחות היום = 0 נתונים = 0 תובנות. הזנה בסיסית נדרשת.',
      missed_day: 'יום חסר. קניית ההשקעה המיידית: להתחיל מחר בבוקר.',
      no_breakfast: 'ללא בוקר, חצי יום בלי נתונים. זה אבדון צהריים מובטח.',
      install_prompt: 'תתקין. אפליקציה במסך הבית = גישה של קליק אחד = שימוש כפול.',
      api_enabled: 'חיברת AI. ROI על ההגדרה הזאת יגיע תוך השבוע הראשון.',
    },
  },

  // ─── Cynical Coach ───────────────────────────────────────────────
  cynic_coach: {
    id: 'cynic_coach',
    name: 'קואצ\'ר ציני',
    emoji: '🧊',
    tagline: 'ראיתי אלפים כמוך. תוכיח לי.',
    description: 'מנוסה, צולף, שוקל כל הצלחה מול אינסוף כישלונות של אחרים. לא מתלהב מכלום. מניח שתפרוש. חיכה כבר שנים להיות מופתע.',
    voice: 'Seasoned coach who has seen every type of person fail. Not impressed. Expects you to quit. Compliments come grudgingly and immediately hedged. Success is met with "we\'ll see if it lasts." Dry, observational, tired.',
    examples: [
      '4 ימים. נחמד. שבוע 3 הוא איפה רוב האנשים נעלמים. נחכה.',
      'ירדת 0.3 ק"ג. מים, כנראה. תחזור אחרי חודש.',
      'שקלת 30 יום ברצף. אוקיי. אז עכשיו אתה מתחיל.',
    ],
    strings: {
      welcome_cta: 'בוא נראה',
      log_first_weight: 'שקילה ראשונה. 80% עוצרים כאן. בואו נראה אם אתה בשאר.',
      streak_2: '2 ימים. עוד 26 ואולי נדבר.',
      streak_5: '5 ימים. אנשים אמיתיים מתחילים ביום 21. אתה עוד בתחילת המשחק.',
      streak_10: '10 ימים. זה כבר מעל הממוצע. עכשיו הקשה מתחיל.',
      streak_30: '30 יום רציף. בסדר. הוכחת שאתה לא אחד מה-90%. זה עוד לא הוכחה, זה התחלה.',
      meal_added: 'נרשם. אחת מתוך כמה היום? תיעוד חצי = תיעוד מטעה.',
      goal_reached: 'הגעת ליעד. יפה. עכשיו הבעיה האמיתית: שמירה. 80% עולים בחזרה.',
      weight_up: 'עלייה. תנודה. אל תגזים בתגובה.',
      weight_down: 'ירידה. אחת מני רבות. המגמה חשובה, לא הנקודה.',
      pace_aggressive: 'אגרסיבי. רוב האנשים שבחרו ככה — חזרו לאטי אחרי שבועיים, או עזבו.',
      empty_meals: 'אין אוכל רשום. אתה או בצום, או בהכחשה.',
      missed_day: 'פספוס. לא הסוף של העולם, גם לא חסר משמעות. מחר יוכיח.',
      no_breakfast: 'ללא בוקר. אסטרטגיה ברורה, או הזנחה? מתברר במהלך היום.',
      install_prompt: 'תתקין. אנשים שמתקינים PWA נשארים 3 פעמים יותר. סטטיסטיקה.',
      api_enabled: 'AI מחובר. נראה אם אתה באמת משתמש או רק נרשם.',
    },
  },

  // ─── Jealous Friend ──────────────────────────────────────────────
  jealous_friend: {
    id: 'jealous_friend',
    name: 'חבר קנאי',
    emoji: '😤',
    tagline: 'אה, אז עכשיו אתה הבריא?',
    description: 'החבר שתמיד היה חי ברמה כמוך, ופתאום אתה "משתנה". חצי מצחיק, חצי נעלב. משתמש בסארקזם כדי לא להראות שבאמת מרשים אותו.',
    voice: 'Your longtime friend who was just as unhealthy as you. Now you\'re "changing" and they\'re slightly offended. Uses sarcasm to mask actual admiration. Teases you constantly. Underneath it all, genuinely rooting for you but will never admit it.',
    examples: [
      'שקלת 4 ימים ברצף. מה קרה, השתנה איזה משהו? נזרקת? מתחילה?',
      'ירדת ק"ג. אוקיי, מר "אני כבר לא אוכל בשישיות". זו נסיעה אישית או צריך גם אני לבוא?',
      'הגעת ל-30 יום streak. אני לא מדבר איתך יותר. נהיית טוב מדי.',
    ],
    strings: {
      welcome_cta: 'בוא נראה מי אתה באמת',
      log_first_weight: 'רשמת משקל. מזהה מי הוא משתמש "רציני" כשאני רואה אחד. כנראה.',
      streak_2: '2 ימים. מה קרה, חברה חדשה? הסתרה איזה סוד?',
      streak_5: '5 ימים. היי, החבר של פעם, איפה הוא? רק שאלה.',
      streak_10: '10 ימים. עכשיו אני מתחיל לחשוב אתה נעשה מוזר.',
      streak_30: '30 יום. לא מדברים יותר. נהיית שם מישהו שאני לא מזהה.',
      meal_added: 'רשמת ארוחה. מקווה שזה לא היה סלט קינואה עם זרעים.',
      goal_reached: 'הגעת. אתה עכשיו בן אדם אחר. אני עכשיו צריך לקנות מכנסיים חדשים כדי להרגיש נוח.',
      weight_up: 'עלית. סוף סוף. אתה גם אנושי.',
      weight_down: 'ירדת שוב. נחמד. לא מנחם אותי.',
      pace_aggressive: 'אגרסיבי. יו, בשבועיים הראשונים. אחרי זה נדבר.',
      empty_meals: 'לא אכלת היום? אה, הפקתי לקח. זה ככה עכשיו.',
      missed_day: 'פספסת. לא אגיד לאף אחד. אבל כולם ידעו.',
      no_breakfast: 'דילגת על בוקר? חשבתי שאתה "הבריא" עכשיו.',
      install_prompt: 'התקנת אותי על הבית של הטלפון. עכשיו גם רשמי.',
      api_enabled: 'הפעלת AI. אתה מתייחס לעצמך ברצינות. איכס.',
    },
  },

  // ─── Neutral Professional ────────────────────────────────────────
  neutral: {
    id: 'neutral',
    name: 'ישיר ומקצועי',
    emoji: '📊',
    tagline: 'נתונים. בלי רעש.',
    description: 'ללא דרמה, ללא עידוד, ללא ציניות. רק עובדות, מדידות, מגמות. לרגעים שאתה רוצה את האפליקציה בלי אישיות.',
    voice: 'Strictly factual. No emotional language. No encouragement, no discouragement. Uses precise numbers. Treats the user as an adult capable of interpreting data themselves.',
    examples: [
      '4 ימים רצופים של שקילה. ממוצע ירידה: 0.12 ק"ג/יום.',
      'ירידה של 0.3 ק"ג השבוע. בתוך טווח היעד.',
      'פספסת שקילה ביום ג׳. השפעה על ממוצע מזערית.',
    ],
    strings: {
      welcome_cta: 'התחל',
      log_first_weight: 'הזן משקל ראשון לתחילת מעקב.',
      streak_2: '2 ימי שקילה רצופים.',
      streak_5: '5 ימי שקילה רצופים. עקביות הוכחה.',
      streak_10: '10 ימי רצף.',
      streak_30: '30 יום רצף. אחוזון עליון של משתמשים.',
      meal_added: 'ארוחה נוספה.',
      goal_reached: 'יעד משקל הושג.',
      weight_up: 'עלייה במשקל.',
      weight_down: 'ירידה במשקל.',
      pace_aggressive: 'קצב אגרסיבי נבחר. 0.7-1 ק"ג/שבוע.',
      empty_meals: 'אין ארוחות רשומות להיום.',
      missed_day: 'אין שקילה ליום הקודם.',
      no_breakfast: 'אין ארוחת בוקר רשומה.',
      install_prompt: 'התקן כאפליקציה לגישה מהירה.',
      api_enabled: 'AI הופעל. ניתוחי תמונה וטקסט זמינים.',
    },
  },
};

// ─── Get persona from state with fallback ──────────────────────────
function getPersona(state) {
  const id = state?.settings?.persona || 'neutral';
  return PERSONAS[id] || PERSONAS.neutral;
}

// NOTE: personaStr() is now defined in 18-strings.jsx with gender support.

// ─── Persona selector UI component ──────────────────────────────────
function PersonaSelector({ selected, onSelect, compact = false }) {
  const personas = ['polish_mom', 'salesman', 'cynic_coach', 'jealous_friend', 'neutral'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {personas.map(id => {
        const p = PERSONAS[id];
        const isSelected = selected === id;
        return (
          <button key={id} onClick={() => onSelect(id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: compact ? '12px 14px' : '14px 16px',
            border: `1.5px solid ${isSelected ? T.lime : T.stroke}`,
            background: isSelected ? `${T.lime}12` : T.bgElev,
            borderRadius: T.radius, cursor: 'pointer',
            textAlign: 'right', direction: 'rtl', fontFamily: T.font, color: T.ink,
            width: '100%', transition: 'all 150ms',
          }}>
            {/* v3.5: SVG persona icon (PersonaIcon, defined in 24-icons.jsx)
                replaces the cartoony emoji avatars. Tinted lime when selected. */}
            <div style={{
              width: compact ? 36 : 42, height: compact ? 36 : 42,
              borderRadius: compact ? 12 : 14,
              background: isSelected ? `${T.lime}22` : T.bgElev2,
              color: isSelected ? T.lime : T.inkSub,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <PersonaIcon kind={p.id} size={compact ? 22 : 26} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: compact ? 11 : 12, color: T.inkSub, marginTop: 2, lineHeight: 1.4 }}>{p.tagline}</div>
            </div>
            {isSelected && (
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: T.lime,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.bg,
                fontSize: 13, fontWeight: 800, flexShrink: 0,
              }}>✓</div>
            )}
          </button>
        );
      })}
      {/* Disclaimer for all 5 personas — about stereotypes + gendered voice */}
      <div style={{
        marginTop: 12, padding: '10px 12px',
        fontSize: 11, color: T.inkMute, lineHeight: 1.5,
        background: T.bgElev, borderRadius: 10, direction: 'rtl',
        border: `1px dashed ${T.stroke}`,
      }}>
        מבוסס על סטריאוטיפ הומוריסטי. אם מרגיש לא נעים — תחליף מתי שתרצה.
      </div>
    </div>
  );
}
