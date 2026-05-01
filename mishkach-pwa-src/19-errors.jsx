// ════════════════════════════════════════════════════════════════════
// 19-errors.jsx — Error messages × 5 personas × 2 genders
// ════════════════════════════════════════════════════════════════════

const ERROR_MESSAGES = {
  network_offline: {
    polish_mom: {
      male: 'אלון, אין רשת. אני יודעת, גם אני לא אוהבת את זה. תנסה עוד שניה.',
      female: 'מירב, אין רשת. אני יודעת, גם אני לא אוהבת את זה. תנסי עוד שניה.',
    },
    salesman: {
      male: 'אלון, הרשת נעלמה לרגע! קפוץ חזרה בעוד שנייה ונחזור לעסקים.',
      female: 'מירב, הרשת נעלמה לרגע! קפצי חזרה בעוד שנייה ונחזור לעסקים.',
    },
    cynic_coach: {
      male: 'אין רשת. תפתור את זה ותחזור, אני לא הולך לשום מקום.',
      female: 'אין רשת. תפתרי את זה ותחזרי, אני לא הולך לשום מקום.',
    },
    jealous_friend: {
      male: 'וואלה, גם לך אין רשת? לפחות אתה לא לבד הפעם.',
      female: 'וואלה, גם לך אין רשת? לפחות את לא לבד הפעם.',
    },
    neutral: {
      male: 'אין חיבור לאינטרנט. נסה שוב.',
      female: 'אין חיבור לאינטרנט. נסי שוב.',
    },
  },
  server_error: {
    polish_mom: {
      male: 'אלון נשמה, משהו התקלקל אצלנו. זה לא אתה, זה אנחנו. תנסה עוד פעם.',
      female: 'מירב נשמה, משהו התקלקל אצלנו. זה לא את, זה אנחנו. תנסי עוד פעם.',
    },
    salesman: {
      male: 'אופס! תקלה קטנה מצדנו, אלון. רגע מסדרים ואתה בחזרה בפנים.',
      female: 'אופס! תקלה קטנה מצדנו, מירב. רגע מסדרים ואת בחזרה בפנים.',
    },
    cynic_coach: {
      male: 'השרת נפל. קורה. תקום ותנסה שוב, לא שברנו את העולם.',
      female: 'השרת נפל. קורה. תקומי ותנסי שוב, לא שברנו את העולם.',
    },
    jealous_friend: {
      male: 'השרת נשבר, כמובן דווקא כשאתה צריך. הסיפור שלי בדיוק.',
      female: 'השרת נשבר, כמובן דווקא כשאת צריכה. הסיפור שלי בדיוק.',
    },
    neutral: {
      male: 'שגיאת שרת. נסה שוב בעוד רגע.',
      female: 'שגיאת שרת. נסי שוב בעוד רגע.',
    },
  },
  api_timeout: {
    polish_mom: {
      male: 'אלון, חיכינו ולא ענו לנו. נורא לא נעים. בוא ננסה שוב יחד.',
      female: 'מירב, חיכינו ולא ענו לנו. נורא לא נעים. בואי ננסה שוב יחד.',
    },
    salesman: {
      male: 'הבקשה התמהמהה, אלון! רגע אחד ואנחנו לוחצים שוב על הגז.',
      female: 'הבקשה התמהמהה, מירב! רגע אחד ואנחנו לוחצים שוב על הגז.',
    },
    cynic_coach: {
      male: 'נגמר הזמן. תנסה שוב, בלי תירוצים.',
      female: 'נגמר הזמן. תנסי שוב, בלי תירוצים.',
    },
    jealous_friend: {
      male: 'הבקשה שלך תקועה. גם אתה מקבל את היחס הזה מהטכנולוגיה?',
      female: 'הבקשה שלך תקועה. גם את מקבלת את היחס הזה מהטכנולוגיה?',
    },
    neutral: {
      male: 'הבקשה לא הושלמה בזמן. נסה שוב.',
      female: 'הבקשה לא הושלמה בזמן. נסי שוב.',
    },
  },
  weekly_cap_exceeded: {
    polish_mom: {
      male: 'אלון מותק, נגמרה לך המנה השבועית. מה לעשות, גם לי נגמרת פעם הסבלנות.',
      female: 'מירב מותק, נגמרה לך המנה השבועית. מה לעשות, גם לי נגמרת פעם הסבלנות.',
    },
    salesman: {
      male: 'סיימת את החבילה השבועית, אלון! רוצה לשדרג? יש לי הצעה שאסור לפספס.',
      female: 'סיימת את החבילה השבועית, מירב! רוצה לשדרג? יש לי הצעה שאסור לפספס.',
    },
    cynic_coach: {
      male: 'אכלת את כל המכסה השבועית. פעיל מדי, תחכה לשבוע הבא.',
      female: 'אכלת את כל המכסה השבועית. פעילה מדי, תחכי לשבוע הבא.',
    },
    jealous_friend: {
      male: 'גמרת את המכסה כבר? אתה יעיל יותר ממני, קצת מעצבן.',
      female: 'גמרת את המכסה כבר? את יעילה יותר ממני, קצת מעצבן.',
    },
    neutral: {
      male: 'חרגת מהמכסה השבועית. נסה שוב בשבוע הבא או שדרג.',
      female: 'חרגת מהמכסה השבועית. נסי שוב בשבוע הבא או שדרגי.',
    },
  },
  invalid_api_key: {
    polish_mom: {
      male: 'אלון, המפתח לא נכון. בוא תבדוק שוב, לאט, בלי לחץ.',
      female: 'מירב, המפתח לא נכון. בואי תבדקי שוב, לאט, בלי לחץ.',
    },
    salesman: {
      male: 'המפתח לא תקין, אלון. בדוק אותו שנייה ונמשיך לסגור עסקאות.',
      female: 'המפתח לא תקין, מירב. בדקי אותו שנייה ונמשיך לסגור עסקאות.',
    },
    cynic_coach: {
      male: 'המפתח שגוי. לא כל מה שמודבק זה נכון, תבדוק שוב.',
      female: 'המפתח שגוי. לא כל מה שמודבק זה נכון, תבדקי שוב.',
    },
    jealous_friend: {
      male: 'המפתח לא תקף. טעית כמו כולנו, אתה מרגיש יותר טוב עכשיו?',
      female: 'המפתח לא תקף. טעית כמו כולנו, את מרגישה יותר טוב עכשיו?',
    },
    neutral: {
      male: 'מפתח API לא תקין. בדוק והזן שוב.',
      female: 'מפתח API לא תקין. בדקי והזיני שוב.',
    },
  },
  weight_too_low: {
    polish_mom: {
      male: 'אלון, זה לא משקל של בן אדם בריא, אני מודאגת. בדוק שוב, בבקשה.',
      female: 'מירב, זה לא משקל של בן אדם בריא, אני מודאגת. בדקי שוב, בבקשה.',
    },
    salesman: {
      male: 'אלון, המשקל נראה נמוך מדי. בדוק את המד ונעדכן ביחד.',
      female: 'מירב, המשקל נראה נמוך מדי. בדקי את המד ונעדכן ביחד.',
    },
    cynic_coach: {
      male: 'המשקל הזה לא הגיוני, אלא אם אתה חתול. תכניס מספר אמיתי.',
      female: 'המשקל הזה לא הגיוני, אלא אם את חתולה. תכניסי מספר אמיתי.',
    },
    jealous_friend: {
      male: 'משקל נמוך כזה? אתה מתחבא לי מאחורי מספרים, אה?',
      female: 'משקל נמוך כזה? את מתחבאת לי מאחורי מספרים, אה?',
    },
    neutral: {
      male: 'המשקל נמוך מהטווח הסביר. בדוק והזן שוב.',
      female: 'המשקל נמוך מהטווח הסביר. בדקי והזיני שוב.',
    },
  },
  weight_too_high: {
    polish_mom: {
      male: 'אלון, אולי הזנת לא נכון? בדוק שוב, אני בטוחה שזו טעות.',
      female: 'מירב, אולי הזנת לא נכון? בדקי שוב, אני בטוחה שזו טעות.',
    },
    salesman: {
      male: 'אלון, המספר נראה מנופח, נכון? תבדוק שנייה ונעלה נכון.',
      female: 'מירב, המספר נראה מנופח, נכון? תבדקי שנייה ונעלה נכון.',
    },
    cynic_coach: {
      male: 'משקל של פיל. אלא אם עלית אתמול על משאית, תתקן.',
      female: 'משקל של פיל. אלא אם עלית אתמול על משאית, תתקני.',
    },
    jealous_friend: {
      male: 'המספר גבוה. אתה בטוח? אני לפחות יודע בדיוק כמה אני.',
      female: 'המספר גבוה. את בטוחה? אני לפחות יודע בדיוק כמה אני.',
    },
    neutral: {
      male: 'המשקל גבוה מהטווח הסביר. בדוק והזן שוב.',
      female: 'המשקל גבוה מהטווח הסביר. בדקי והזיני שוב.',
    },
  },
  invalid_photo: {
    polish_mom: {
      male: 'אלון, התמונה לא עלתה כמו שצריך. נסה שוב עם תמונה ברורה, יקירי.',
      female: 'מירב, התמונה לא עלתה כמו שצריך. נסי שוב עם תמונה ברורה, יקירתי.',
    },
    salesman: {
      male: 'התמונה הזו לא אומרת לי כלום, אלון. תעלה תמונה איכותית ונצא לדרך.',
      female: 'התמונה הזו לא אומרת לי כלום, מירב. תעלי תמונה איכותית ונצא לדרך.',
    },
    cynic_coach: {
      male: 'תמונה לא תקינה. תעלה משהו שנראה כמו אוכל, לא אמנות מופשטת.',
      female: 'תמונה לא תקינה. תעלי משהו שנראה כמו אוכל, לא אמנות מופשטת.',
    },
    jealous_friend: {
      male: 'התמונה לא עובדת. גם אתה לא יודע לצלם אוכל? מנחם.',
      female: 'התמונה לא עובדת. גם את לא יודעת לצלם אוכל? מנחם.',
    },
    neutral: {
      male: 'פורמט תמונה לא נתמך. נסה תמונה אחרת.',
      female: 'פורמט תמונה לא נתמך. נסי תמונה אחרת.',
    },
  },
};

function personaError(state, key, fallback = 'אירעה תקלה. נסה שוב.') {
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const name = (state?.user?.name || '').trim();

  const entry = ERROR_MESSAGES[key];
  if (!entry) return fallback;

  const personaEntry = entry[personaId] || entry.neutral;
  if (!personaEntry) return fallback;

  let text = personaEntry[gender] || personaEntry.male || fallback;

  if (name) {
    const placeholder = gender === 'female' ? 'מירב' : 'אלון';
    if (name !== placeholder) {
      text = text.replace(new RegExp(placeholder, 'g'), name);
    }
  }
  return text;
}

// ─── Classify a raw error and return persona-aware message ──────────
// Inspects e.message and routes to the right error key.
function personaErrorFromException(state, e, fallback) {
  const msg = (e?.message || String(e || '')).toLowerCase();

  // Network / offline
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return personaError(state, 'network_offline', fallback || 'אין חיבור לאינטרנט');
  }
  // Timeout
  if (msg.includes('timeout') || msg.includes('aborted')) {
    return personaError(state, 'api_timeout', fallback || 'הבקשה לא הושלמה בזמן');
  }
  // Rate limit / cap
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('cap exceeded') || msg.includes('weekly cap') || msg.includes('quota')) {
    return personaError(state, 'weekly_cap_exceeded', fallback || 'חרגת מהמכסה השבועית');
  }
  // Auth failures (API key)
  if (msg.includes('invalid_api_key') || msg.includes('401') || msg.includes('unauthorized') || msg.includes('authentication')) {
    return personaError(state, 'invalid_api_key', fallback || 'מפתח API לא תקין');
  }
  // Server errors
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('server')) {
    return personaError(state, 'server_error', fallback || 'שגיאת שרת');
  }
  // Photo / image issues
  if (msg.includes('image') || msg.includes('photo')) {
    return personaError(state, 'invalid_photo', fallback || 'בעיה בתמונה');
  }
  // Default — return original message (it's probably useful)
  return e?.message || fallback || 'אירעה תקלה';
}
