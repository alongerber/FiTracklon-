// ════════════════════════════════════════════════════════════════════
// 18-strings.jsx — All UI strings in 5 personas × 2 genders
// ════════════════════════════════════════════════════════════════════

const STRINGS = {
  streak_2: {
    polish_mom: {
      male: 'אלון ילד שלי, יומיים ברצף. לא צוחקים על התחלה כזאת.',
      female: 'מירב יקירה, יומיים ברצף. לא צוחקים על התחלה כזאת.',
    },
    salesman: {
      male: 'אלון אח שלי, יומיים רצוף. התחלה ששווה להמשיך.',
      female: 'מירב אחותי, יומיים רצוף. התחלה ששווה להמשיך.',
    },
    cynic_coach: {
      male: 'יומיים ברצף. ממשיכים.',
      female: 'יומיים ברצף. ממשיכים.',
    },
    jealous_friend: {
      male: 'אלון אחי, יומיים? יפה. עכשיו גם אני צריך להתאמץ.',
      female: 'מירב אחותי, יומיים? יפה. עכשיו גם אני צריכה להתאמץ.',
    },
    neutral: {
      male: 'יומיים ברצף.',
      female: 'יומיים ברצף.',
    },
  },
  streak_3: {
    polish_mom: {
      male: 'אלון ילד שלי, שלושה ימים. כבר מתחיל להיראות כמו הרגל.',
      female: 'מירב יקירה, שלושה ימים. כבר מתחיל להיראות כמו הרגל.',
    },
    salesman: {
      male: 'אלון אח שלי, שלושה ימים. עכשיו זה כבר לא מקרי.',
      female: 'מירב אחותי, שלושה ימים. עכשיו זה כבר לא מקרי.',
    },
    cynic_coach: { male: 'שלושה ימים ברצף. יש קצב.', female: 'שלושה ימים ברצף. יש קצב.' },
    jealous_friend: {
      male: 'אלון אחי, שלושה ימים. הבנתי, לקחת את זה אישית.',
      female: 'מירב אחותי, שלושה ימים. הבנתי, לקחת את זה אישית.',
    },
    neutral: { male: 'שלושה ימים ברצף.', female: 'שלושה ימים ברצף.' },
  },
  streak_5: {
    polish_mom: {
      male: 'אלון ילד שלי, חמישה ימים. אבא שלך היה קורא לזה התמדה.',
      female: 'מירב יקירה, חמישה ימים. אמא שלך הייתה קוראת לזה התמדה.',
    },
    salesman: {
      male: 'אלון אח שלי, חמישה ימים. זה כבר נכס.',
      female: 'מירב אחותי, חמישה ימים. זה כבר נכס.',
    },
    cynic_coach: { male: 'חמישה ימים ברצף. יציב.', female: 'חמישה ימים ברצף. יציב.' },
    jealous_friend: {
      male: 'אלון אחי, חמישה ימים? טוב, אתה מגזים לטובה.',
      female: 'מירב אחותי, חמישה ימים? טוב, את מגזימה לטובה.',
    },
    neutral: { male: 'חמישה ימים ברצף.', female: 'חמישה ימים ברצף.' },
  },
  streak_7: {
    polish_mom: {
      male: 'אלון ילד שלי, שבוע שלם. הנה, אפשר לסמוך עליך קצת.',
      female: 'מירב יקירה, שבוע שלם. הנה, אפשר לסמוך עלייך קצת.',
    },
    salesman: {
      male: 'אלון אח שלי, שבוע מלא. תסמוך עלי, זה נראה טוב.',
      female: 'מירב אחותי, שבוע מלא. תסמכי עלי, זה נראה טוב.',
    },
    cynic_coach: { male: 'שבעה ימים ברצף. שבוע הושלם.', female: 'שבעה ימים ברצף. שבוע הושלם.' },
    jealous_friend: {
      male: 'אלון אחי, שבוע שלם. לא היית חייב להשאיר אותי מאחור.',
      female: 'מירב אחותי, שבוע שלם. לא היית חייבת להשאיר אותי מאחור.',
    },
    neutral: { male: 'שבוע ברצף הושלם.', female: 'שבוע ברצף הושלם.' },
  },
  streak_10: {
    polish_mom: {
      male: 'אלון ילד שלי, עשרה ימים. כבר קשה להתווכח עם מספרים.',
      female: 'מירב יקירה, עשרה ימים. כבר קשה להתווכח עם מספרים.',
    },
    salesman: {
      male: 'אלון אח שלי, עשרה ימים. שווה לך לשמור על הרצף הזה.',
      female: 'מירב אחותי, עשרה ימים. שווה לך לשמור על הרצף הזה.',
    },
    cynic_coach: { male: 'עשרה ימים ברצף. התקדמות ברורה.', female: 'עשרה ימים ברצף. התקדמות ברורה.' },
    jealous_friend: {
      male: 'אלון אחי, עשרה ימים. בסדר, קלטנו שאתה רציני.',
      female: 'מירב אחותי, עשרה ימים. בסדר, קלטנו שאת רצינית.',
    },
    neutral: { male: 'עשרה ימים ברצף.', female: 'עשרה ימים ברצף.' },
  },
  streak_14: {
    polish_mom: {
      male: 'אלון ילד שלי, שבועיים. זה כבר לא מצב רוח, זה אופי.',
      female: 'מירב יקירה, שבועיים. זה כבר לא מצב רוח, זה אופי.',
    },
    salesman: {
      male: 'אלון אח שלי, שבועיים רצוף. זה כבר סיפור טוב.',
      female: 'מירב אחותי, שבועיים רצוף. זה כבר סיפור טוב.',
    },
    cynic_coach: { male: '14 ימים ברצף. עקביות גבוהה.', female: '14 ימים ברצף. עקביות גבוהה.' },
    jealous_friend: {
      male: 'אלון אחי, שבועיים? אתה נהיה בלתי נסבל בקטע מעורר קנאה.',
      female: 'מירב אחותי, שבועיים? את נהיית בלתי נסבלת בקטע מעורר קנאה.',
    },
    neutral: { male: '14 ימים ברצף.', female: '14 ימים ברצף.' },
  },
  streak_30: {
    polish_mom: {
      male: 'אלון ילד שלי, חודש שלם. יפה מאוד, בלי עין הרע.',
      female: 'מירב יקירה, חודש שלם. יפה מאוד, בלי עין הרע.',
    },
    salesman: {
      male: 'אלון אח שלי, 30 יום. זה כבר משהו שאפשר למכור כהצלחה.',
      female: 'מירב אחותי, 30 יום. זה כבר משהו שאפשר למכור כהצלחה.',
    },
    cynic_coach: { male: '30 ימים ברצף. חודש הושלם.', female: '30 ימים ברצף. חודש הושלם.' },
    jealous_friend: {
      male: 'אלון אחי, חודש שלם? נהדר. ממש לא מעצבן בכלל.',
      female: 'מירב אחותי, חודש שלם? נהדר. ממש לא מעצבן בכלל.',
    },
    neutral: { male: '30 ימים ברצף.', female: '30 ימים ברצף.' },
  },
  weight_up_small: {
    polish_mom: {
      male: 'אלון ילד שלי, עלית קצת. לא עושים דרמה מכל גרם.',
      female: 'מירב יקירה, עלית קצת. לא עושים דרמה מכל גרם.',
    },
    salesman: {
      male: 'אלון אח שלי, עלייה קטנה. לא משנים תכנית על רעש.',
      female: 'מירב אחותי, עלייה קטנה. לא משנים תכנית על רעש.',
    },
    cynic_coach: { male: 'עלייה קטנה. לא מסיקים מסקנות.', female: 'עלייה קטנה. לא מסיקים מסקנות.' },
    jealous_friend: {
      male: 'אלון אחי, עלית קצת. איזה כיף לי לראות את זה.',
      female: 'מירב אחותי, עלית קצת. איזה כיף לי לראות את זה.',
    },
    neutral: { male: 'נרשמה עלייה קטנה במשקל.', female: 'נרשמה עלייה קטנה במשקל.' },
  },
  weight_down_small: {
    polish_mom: {
      male: 'אלון ילד שלי, ירדת קצת. ככה עושים את זה, בשקט.',
      female: 'מירב יקירה, ירדת קצת. ככה עושים את זה, בשקט.',
    },
    salesman: {
      male: 'אלון אח שלי, ירידה קטנה. שווה לך להמשיך בדיוק ככה.',
      female: 'מירב אחותי, ירידה קטנה. שווה לך להמשיך בדיוק ככה.',
    },
    cynic_coach: { male: 'ירידה קטנה. כיוון טוב.', female: 'ירידה קטנה. כיוון טוב.' },
    jealous_friend: {
      male: 'אלון אחי, ירדת קצת. מפרגן לך, לא בנחת.',
      female: 'מירב אחותי, ירדת קצת. מפרגנת לך, לא בנחת.',
    },
    neutral: { male: 'נרשמה ירידה קטנה במשקל.', female: 'נרשמה ירידה קטנה במשקל.' },
  },
  goal_reached: {
    polish_mom: {
      male: 'אלון ילד שלי, הגעת ליעד. עכשיו אל תתקלקל לי.',
      female: 'מירב יקירה, הגעת ליעד. עכשיו אל תתקלקלי לי.',
    },
    salesman: {
      male: 'אלון אח שלי, היעד הושג. תסמוך עלי, זה רגע גדול.',
      female: 'מירב אחותי, היעד הושג. תסמכי עלי, זה רגע גדול.',
    },
    cynic_coach: { male: 'היעד הושג.', female: 'היעד הושג.' },
    jealous_friend: {
      male: 'אלון אחי, הגעת ליעד. מרגש, לא נעים, ובעיקר מעצבן.',
      female: 'מירב אחותי, הגעת ליעד. מרגש, לא נעים, ובעיקר מעצבן.',
    },
    neutral: { male: 'היעד הושג בהצלחה.', female: 'היעד הושג בהצלחה.' },
  },
  welcome_cta: {
    polish_mom: { male: 'אלון ילד שלי, מתחילים.', female: 'מירב יקירה, מתחילות.' },
    salesman: { male: 'יאללה מתחילים', female: 'יאללה מתחילות' },
    cynic_coach: { male: 'התחל', female: 'התחילי' },
    jealous_friend: { male: 'נו תתחיל', female: 'נו תתחילי' },
    neutral: { male: 'התחל', female: 'התחילי' },
  },
  save_button: {
    polish_mom: { male: 'שמור כבר', female: 'שמרי כבר' },
    salesman: { male: 'שמור', female: 'שמרי' },
    cynic_coach: { male: 'שמור', female: 'שמרי' },
    jealous_friend: { male: 'תשמור', female: 'תשמרי' },
    neutral: { male: 'שמור', female: 'שמרי' },
  },
  cancel_button: {
    polish_mom: { male: 'ביטול', female: 'ביטול' },
    salesman: { male: 'בטל', female: 'בטלי' },
    cynic_coach: { male: 'בטל', female: 'בטלי' },
    jealous_friend: { male: 'עזוב', female: 'עזבי' },
    neutral: { male: 'בטל', female: 'בטלי' },
  },
  meal_added: {
    polish_mom: {
      male: 'אלון ילד שלי, הארוחה נשמרה. ככה מנהלים עניינים.',
      female: 'מירב יקירה, הארוחה נשמרה. ככה מנהלים עניינים.',
    },
    salesman: {
      male: 'אלון אח שלי, הארוחה בפנים. שווה להמשיך ככה.',
      female: 'מירב אחותי, הארוחה בפנים. שווה להמשיך ככה.',
    },
    cynic_coach: { male: 'הארוחה נוספה.', female: 'הארוחה נוספה.' },
    jealous_friend: {
      male: 'אלון אחי, הוספת ארוחה. תודה שאתה מסודר יותר ממני.',
      female: 'מירב אחותי, הוספת ארוחה. תודה שאת מסודרת יותר ממני.',
    },
    neutral: { male: 'הארוחה נוספה.', female: 'הארוחה נוספה.' },
  },
  empty_meals: {
    polish_mom: {
      male: 'אלון ילד שלי, עוד לא רשמת מה אכלת. מה, אני אמורה לנחש.',
      female: 'מירב יקירה, עוד לא רשמת מה אכלת. מה, אני אמורה לנחש.',
    },
    salesman: {
      male: 'אלון אח שלי, אין ארוחות היום. שווה להתחיל לרשום.',
      female: 'מירב אחותי, אין ארוחות היום. שווה להתחיל לרשום.',
    },
    cynic_coach: { male: 'אין ארוחות רשומות להיום.', female: 'אין ארוחות רשומות להיום.' },
    jealous_friend: {
      male: 'אלון אחי, אין פה כלום. נוח לך שהאפליקציה לא יודעת, אה.',
      female: 'מירב אחותי, אין פה כלום. נוח לך שהאפליקציה לא יודעת, אה.',
    },
    neutral: { male: 'עדיין לא נוספו ארוחות.', female: 'עדיין לא נוספו ארוחות.' },
  },
  first_weight: {
    polish_mom: {
      male: 'אלון ילד שלי, שקילה ראשונה. מכאן מתחילים לדבר אמת.',
      female: 'מירב יקירה, שקילה ראשונה. מכאן מתחילים לדבר אמת.',
    },
    salesman: {
      male: 'אלון אח שלי, שקילה ראשונה בפנים. עכשיו יש עם מה לעבוד.',
      female: 'מירב אחותי, שקילה ראשונה בפנים. עכשיו יש עם מה לעבוד.',
    },
    cynic_coach: { male: 'נקודת ההתחלה נשמרה.', female: 'נקודת ההתחלה נשמרה.' },
    jealous_friend: {
      male: 'אלון אחי, שקילה ראשונה. יפה, עכשיו גם למספרים יש דעה.',
      female: 'מירב אחותי, שקילה ראשונה. יפה, עכשיו גם למספרים יש דעה.',
    },
    neutral: { male: 'השקילה הראשונה נשמרה.', female: 'השקילה הראשונה נשמרה.' },
  },
  missed_day_1: {
    polish_mom: {
      male: 'אלון ילד שלי, יום אחד פספסת. לא נורא, חוזרים.',
      female: 'מירב יקירה, יום אחד פספסת. לא נורא, חוזרות.',
    },
    salesman: {
      male: 'אלון אח שלי, פספסת יום. קורה, תחזור לקו.',
      female: 'מירב אחותי, פספסת יום. קורה, תחזרי לקו.',
    },
    cynic_coach: { male: 'יום אחד ללא שקילה.', female: 'יום אחד ללא שקילה.' },
    jealous_friend: {
      male: 'אלון אחי, נעלמת יום. כבר התחלתי ליהנות מוקדם מדי.',
      female: 'מירב אחותי, נעלמת יום. כבר התחלתי ליהנות מוקדם מדי.',
    },
    neutral: { male: 'לא נרשמה שקילה היום.', female: 'לא נרשמה שקילה היום.' },
  },
  new_low_weight: {
    polish_mom: {
      male: 'אלון ילד שלי, שיא חדש למטה. עכשיו תנשום ואל תעשה מזה הצגה.',
      female: 'מירב יקירה, שיא חדש למטה. עכשיו תנשמי ואל תעשי מזה הצגה.',
    },
    salesman: {
      male: 'אלון אח שלי, שפל חדש במשקל. זה שווה צילום מסך.',
      female: 'מירב אחותי, שפל חדש במשקל. זה שווה צילום מסך.',
    },
    cynic_coach: { male: 'נשבר שיא משקל נמוך חדש.', female: 'נשבר שיא משקל נמוך חדש.' },
    jealous_friend: {
      male: 'אלון אחי, שיא חדש למטה. תודה שאתה מקשה על כולנו.',
      female: 'מירב אחותי, שיא חדש למטה. תודה שאת מקשה על כולנו.',
    },
    neutral: { male: 'נרשם משקל נמוך חדש.', female: 'נרשם משקל נמוך חדש.' },
  },
  plateau_warning: {
    polish_mom: {
      male: 'אלון ילד שלי, נראה שאתה תקוע. אז אולי תפסיק לאכול על אוטומט.',
      female: 'מירב יקירה, נראה שאת תקועה. אז אולי תפסיקי לאכול על אוטומט.',
    },
    salesman: {
      male: 'אלון אח שלי, יש סימני פלטו. שווה לשנות משהו קטן.',
      female: 'מירב אחותי, יש סימני פלטו. שווה לשנות משהו קטן.',
    },
    cynic_coach: { male: 'זוהתה עצירה בהתקדמות.', female: 'זוהתה עצירה בהתקדמות.' },
    jealous_friend: {
      male: 'אלון אחי, אתה תקוע. נעים לי מדי לראות את זה.',
      female: 'מירב אחותי, את תקועה. נעים לי מדי לראות את זה.',
    },
    neutral: { male: 'נראה שיש עצירה במגמה.', female: 'נראה שיש עצירה במגמה.' },
  },
  reminder_morning: {
    polish_mom: {
      male: 'אלון ילד שלי, בוקר. תישקל לפני שהיום יתחיל לשקר.',
      female: 'מירב יקירה, בוקר. תישקלי לפני שהיום יתחיל לשקר.',
    },
    salesman: {
      male: 'אלון אח שלי, בוקר טוב. שווה להישקל עכשיו.',
      female: 'מירב אחותי, בוקר טוב. שווה להישקל עכשיו.',
    },
    cynic_coach: { male: 'תזכורת בוקר: זמן לשקילה.', female: 'תזכורת בוקר: זמן לשקילה.' },
    jealous_friend: {
      male: 'אלון אחי, בוקר. לפני שהקפה נותן לך ביטחון מזויף, תישקל.',
      female: 'מירב אחותי, בוקר. לפני שהקפה נותן לך ביטחון מזויף, תישקלי.',
    },
    neutral: { male: 'בוקר טוב. הגיע זמן שקילה.', female: 'בוקר טוב. הגיע זמן שקילה.' },
  },
  notification_enabled: {
    polish_mom: {
      male: 'אלון ילד שלי, ההתראות פועלות. עכשיו אין תירוצים.',
      female: 'מירב יקירה, ההתראות פועלות. עכשיו אין תירוצים.',
    },
    salesman: {
      male: 'אלון אח שלי, ההתראות פעילות. תסמוך עלי, זה יעזור.',
      female: 'מירב אחותי, ההתראות פעילות. תסמכי עלי, זה יעזור.',
    },
    cynic_coach: { male: 'התראות הופעלו.', female: 'התראות הופעלו.' },
    jealous_friend: {
      male: 'אלון אחי, ההתראות דולקות. איזה כיף, עכשיו האפליקציה גם תנדנד לך.',
      female: 'מירב אחותי, ההתראות דולקות. איזה כיף, עכשיו האפליקציה גם תנדנד לך.',
    },
    neutral: { male: 'ההתראות הופעלו.', female: 'ההתראות הופעלו.' },
  },
  missed_day_1: {
    polish_mom: {
      male: 'אלון, יום שלם בלי שקילה. זה לא נורא. בוא נחזור.',
      female: 'מירב, יום שלם בלי שקילה. זה לא נורא. בואי נחזור.',
    },
    salesman: {
      male: 'אלון אחי, פספסת יום. שווה לחזור היום ולא להפסיד את הקצב.',
      female: 'מירב אחותי, פספסת יום. שווה לחזור היום ולא להפסיד את הקצב.',
    },
    cynic_coach: { male: 'יום אחד פספסת. תחזור.', female: 'יום אחד פספסת. תחזרי.' },
    jealous_friend: {
      male: 'אחי, ראית? גם אתה מפספס לפעמים. עזרת לי להרגיש פחות לבד.',
      female: 'אחותי, ראית? גם את מפספסת לפעמים. עזרת לי להרגיש פחות לבד.',
    },
    neutral: { male: 'לא נרשמה שקילה אתמול.', female: 'לא נרשמה שקילה אתמול.' },
  },
  missed_day_3: {
    polish_mom: {
      male: 'אלון ילד שלי, שלושה ימים בלי שקילה? אתה בסדר? אמא דואגת.',
      female: 'מירב ילדה שלי, שלושה ימים בלי שקילה? את בסדר? אמא דואגת.',
    },
    salesman: {
      male: 'אלון, שלושה ימים אאוט. שווה להיכנס היום, לפני שזה הופך להרגל גרוע.',
      female: 'מירב, שלושה ימים אאוט. שווה להיכנס היום, לפני שזה הופך להרגל גרוע.',
    },
    cynic_coach: { male: 'שלושה ימים בלי שקילה. תחזור היום.', female: 'שלושה ימים בלי שקילה. תחזרי היום.' },
    jealous_friend: {
      male: 'אחי, שלושה ימים? התחלתי כבר לחשוב שאני לבד בעניין הזה.',
      female: 'אחותי, שלושה ימים? התחלתי כבר לחשוב שאני לבד בעניין הזה.',
    },
    neutral: { male: 'לא נרשמה שקילה ב-3 הימים האחרונים.', female: 'לא נרשמה שקילה ב-3 הימים האחרונים.' },
  },
  missed_day_7: {
    polish_mom: {
      male: 'אלון, שבוע שלם. זה כבר לא פספוס, זה ויתור. אני לא אגיד שום דבר, אבל...',
      female: 'מירב, שבוע שלם. זה כבר לא פספוס, זה ויתור. אני לא אגיד שום דבר, אבל...',
    },
    salesman: {
      male: 'אלון, שבוע. זה הזמן לחזור — לפני שהמסע שלך פג תוקף.',
      female: 'מירב, שבוע. זה הזמן לחזור — לפני שהמסע שלך פג תוקף.',
    },
    cynic_coach: { male: 'שבוע בלי שקילה. תחליט: בפנים או בחוץ.', female: 'שבוע בלי שקילה. תחליטי: בפנים או בחוץ.' },
    jealous_friend: {
      male: 'אחי, שבוע נעלמת. תוצאות הקנאה שלי גדלות מדי יום, תחזור.',
      female: 'אחותי, שבוע נעלמת. תוצאות הקנאה שלי גדלות מדי יום, תחזרי.',
    },
    neutral: { male: 'לא נרשמה שקילה שבוע.', female: 'לא נרשמה שקילה שבוע.' },
  },
  empty_meals: {
    polish_mom: {
      male: 'אלון, עדיין לא רשמת מה אכלת היום. אני לא מנחשת.',
      female: 'מירב, עדיין לא רשמת מה אכלת היום. אני לא מנחשת.',
    },
    salesman: {
      male: 'אלון אחי, היום עוד לא נרשם. שווה לפתוח עכשיו ולא בלילה.',
      female: 'מירב אחותי, היום עוד לא נרשם. שווה לפתוח עכשיו ולא בלילה.',
    },
    cynic_coach: { male: 'אין רישום של היום.', female: 'אין רישום של היום.' },
    jealous_friend: {
      male: 'אחי, ריק לגמרי? נעים לראות שגם אתה אנושי.',
      female: 'אחותי, ריק לגמרי? נעים לראות שגם את אנושית.',
    },
    neutral: { male: 'עדיין אין ארוחות היום.', female: 'עדיין אין ארוחות היום.' },
  },
  welcome_cta: {
    polish_mom: { male: 'בוא נתחיל, ילד שלי', female: 'בואי נתחיל, ילדה שלי' },
    salesman: { male: 'יאללה אחי, מתחילים', female: 'יאללה אחותי, מתחילים' },
    cynic_coach: { male: 'נתחיל', female: 'נתחיל' },
    jealous_friend: { male: 'אוקיי, בוא נראה', female: 'אוקיי, בואי נראה' },
    neutral: { male: 'התחל', female: 'התחילי' },
  },
  save_button: {
    polish_mom: { male: 'תשמור', female: 'תשמרי' },
    salesman: { male: 'שמור', female: 'שמרי' },
    cynic_coach: { male: 'שמור', female: 'שמרי' },
    jealous_friend: { male: 'תשמור', female: 'תשמרי' },
    neutral: { male: 'שמור', female: 'שמרי' },
  },
  cancel_button: {
    polish_mom: { male: 'בטל', female: 'בטלי' },
    salesman: { male: 'בטל', female: 'בטלי' },
    cynic_coach: { male: 'בטל', female: 'בטלי' },
    jealous_friend: { male: 'עזוב', female: 'עזבי' },
    neutral: { male: 'בטל', female: 'בטלי' },
  },
  reminder_morning: {
    polish_mom: { male: 'אלון, בוקר טוב. אל תשכח לשקול לפני שאתה יוצא.', female: 'מירב, בוקר טוב. אל תשכחי לשקול לפני שאת יוצאת.' },
    salesman: { male: 'אלון אחי, בוקר. שקילה ראשונה של היום, חמישה שניות.', female: 'מירב אחותי, בוקר. שקילה ראשונה של היום, חמישה שניות.' },
    cynic_coach: { male: 'בוקר. תשקול.', female: 'בוקר. תשקלי.' },
    jealous_friend: { male: 'אחי, בוקר. אם לא תשקול עכשיו, גם אני אחכה.', female: 'אחותי, בוקר. אם לא תשקלי עכשיו, גם אני אחכה.' },
    neutral: { male: 'הגיע זמן השקילה.', female: 'הגיע זמן השקילה.' },
  },
  favorite_added: {
    polish_mom: {
      male: 'אלון, נוסף מהמועדפים. ככה יותר מהיר, נכון?',
      female: 'מירב, נוסף מהמועדפים. ככה יותר מהיר, נכון?',
    },
    salesman: {
      male: 'אלון, הכנסנו מהמועדפים. חוסך זמן, שווה זהב.',
      female: 'מירב, הכנסנו מהמועדפים. חוסך זמן, שווה זהב.',
    },
    cynic_coach: { male: 'נוסף מהמועדפים.', female: 'נוסף מהמועדפים.' },
    jealous_friend: {
      male: 'אחי, שוב אותה ארוחה? לפחות אתה עקבי.',
      female: 'אחותי, שוב אותה ארוחה? לפחות את עקבית.',
    },
    neutral: { male: 'נוסף מהמועדפים.', female: 'נוסף מהמועדפים.' },
  },
  favorite_removed: {
    polish_mom: {
      male: 'אלון, הוסר מהמועדפים. מתחרטים? תחזיר.',
      female: 'מירב, הוסר מהמועדפים. מתחרטת? תחזירי.',
    },
    salesman: {
      male: 'אלון, הוסר מהמועדפים. בסדר, לא לכל אחד מתחברים.',
      female: 'מירב, הוסר מהמועדפים. בסדר, לא לכל אחת מתחברים.',
    },
    cynic_coach: { male: 'הוסר מהמועדפים.', female: 'הוסר מהמועדפים.' },
    jealous_friend: {
      male: 'אחי, מחקת את זה? מעניין מה שתגלה שתתגעגע.',
      female: 'אחותי, מחקת את זה? מעניין מתי שתגלי שתתגעגעי.',
    },
    neutral: { male: 'הוסר מהמועדפים.', female: 'הוסר מהמועדפים.' },
  },

  // ─── Report: insufficient data screen ────────────────────────────
  // Vars: {X} = days_logged, {Y} = days_needed
  report_insufficient_data: {
    polish_mom: {
      male: 'אלון מותק, יש לך רק {X} ימים. אני לא לוחצת, אבל גם לא ישנה בלילה.',
      female: 'מותק, יש לך רק {X} ימים. אני לא לוחצת, אבל גם לא ישנה בלילה.',
    },
    salesman: {
      male: 'אלון, רק {X} ימים בתיק. חבל על הפוטנציאל — הדוח שלך עוד לא מוכן לסגירה.',
      female: 'מירב, רק {X} ימים בתיק. חבל על הפוטנציאל — הדוח שלך עוד לא מוכן לסגירה.',
    },
    cynic_coach: {
      male: '{X} ימים. ראיתי הרבה התחלות דומות. תוכיח שאתה הולך הלאה.',
      female: '{X} ימים. ראיתי הרבה התחלות דומות. תוכיחי שאת הולכת הלאה.',
    },
    jealous_friend: {
      male: 'רק {X} ימים? אני לפחות מתעצל בעקביות. עוד קצת ואני אתחיל להתרשם.',
      female: 'רק {X} ימים? אני לפחות מתעצל בעקביות. עוד קצת ואני אתחיל להתרשם.',
    },
    neutral: {
      male: 'נרשמו {X}/7 ימים בתקופה. נדרש מינימום של 7 לחישוב תובנות.',
      female: 'נרשמו {X}/7 ימים בתקופה. נדרש מינימום של 7 לחישוב תובנות.',
    },
  },

  // Vars: {Y} = days_left
  report_keep_logging: {
    polish_mom: {
      male: 'תרשום לי עוד {Y} ימים, ואז נדבר. אני אזכיר לך כל בוקר אם צריך.',
      female: 'תרשמי לי עוד {Y} ימים, ואז נדבר. אני אזכיר לך כל בוקר אם צריך.',
    },
    salesman: {
      male: 'עוד {Y} שקילות והדוח הופך לסיפור הצלחה. אל תוותר עכשיו.',
      female: 'עוד {Y} שקילות והדוח הופך לסיפור הצלחה. אל תוותרי עכשיו.',
    },
    cynic_coach: {
      male: 'עוד {Y} ימים. אם בא לך — תחזור. אני לא הולך לשום מקום.',
      female: 'עוד {Y} ימים. אם בא לך — תחזרי. אני לא הולך לשום מקום.',
    },
    jealous_friend: {
      male: 'עוד {Y} ושוב תזכיר לי שאני זה שלא עושה כלום.',
      female: 'עוד {Y} ושוב תזכירי לי שאני זה שלא עושה כלום.',
    },
    neutral: {
      male: 'יש להוסיף {Y} ימי שקילה נוספים לקבלת ניתוח.',
      female: 'יש להוסיף {Y} ימי שקילה נוספים לקבלת ניתוח.',
    },
  },

  // ─── Weight overwrite warning (used by LogScreen confirm dialog) ──
  // Vars: {DATE} = formatted date (e.g. "ש׳ · 14.5"), {OLD} = existing weight
  weight_overwrite_warning: {
    polish_mom: {
      male: 'אלון, יש לי כבר רישום ל-{DATE} עם {OLD} ק״ג. אתה בטוח שאתה רוצה לשנות?',
      female: 'מותק, יש לי כבר רישום ל-{DATE} עם {OLD} ק״ג. את בטוחה שאת רוצה לשנות?',
    },
    salesman: {
      male: 'יש לך כבר נתון ל-{DATE}: {OLD} ק״ג. החלפה = data overwrite. ממשיך?',
      female: 'יש לך כבר נתון ל-{DATE}: {OLD} ק״ג. החלפה = data overwrite. ממשיכה?',
    },
    cynic_coach: {
      male: 'כבר רשמת {OLD} ק״ג ב-{DATE}. החלפה = החלפה. בלי דרמה.',
      female: 'כבר רשמת {OLD} ק״ג ב-{DATE}. החלפה = החלפה. בלי דרמה.',
    },
    jealous_friend: {
      male: 'אה, ב-{DATE} כבר היה {OLD}. רוצה להעלים ראיות, אה?',
      female: 'אה, ב-{DATE} כבר היה {OLD}. רוצה להעלים ראיות, אה?',
    },
    neutral: {
      male: 'קיימת שקילה ב-{DATE}: {OLD} ק״ג. החלפה תדרוס את הקיים.',
      female: 'קיימת שקילה ב-{DATE}: {OLD} ק״ג. החלפה תדרוס את הקיים.',
    },
  },

  // ─── Saved a back-dated weight (LogScreen toast, no overwrite) ───
  // Vars: {DATE} = formatted date
  weight_saved_backdated: {
    polish_mom: {
      male: 'נרשם ל-{DATE}. אבל מה היה? למה לא שקלת אז?',
      female: 'נרשם ל-{DATE}. אבל מה היה? למה לא שקלת אז?',
    },
    salesman: {
      male: 'BACKFILL נרשם ל-{DATE}. הPipeline שלך מעודכן.',
      female: 'BACKFILL נרשם ל-{DATE}. הPipeline שלך מעודכן.',
    },
    cynic_coach: { male: 'נרשם ל-{DATE}.', female: 'נרשם ל-{DATE}.' },
    jealous_friend: {
      male: 'אהה, מילאת ל-{DATE} בדיעבד. נראה לך טוב יותר עכשיו?',
      female: 'אהה, מילאת ל-{DATE} בדיעבד. נראה לך טוב יותר עכשיו?',
    },
    neutral: { male: 'השקילה נרשמה ל-{DATE}.', female: 'השקילה נרשמה ל-{DATE}.' },
  },

  // ─── Quick log save toast (used by QuickLogDialog) ────────────────
  // Vars: {EX} = exercise name (Hebrew), {REPS} = reps OR minutes
  quick_log_saved: {
    polish_mom: {
      male: 'אלון יקירי, נרשם. {REPS} {EX}? אבל אתה אכלת מספיק לפני?',
      female: 'מירב יקירה, נרשם. {REPS} {EX}? אבל את אכלת מספיק לפני?',
    },
    salesman: {
      male: 'QUICK SAVE 💪 {REPS} {EX} בכיס. KEEP CRUSHING!',
      female: 'QUICK SAVE 💪 {REPS} {EX} בכיס. KEEP CRUSHING!',
    },
    cynic_coach: {
      male: '{REPS} {EX}. רשמתי.',
      female: '{REPS} {EX}. רשמתי.',
    },
    jealous_friend: {
      male: '{REPS} {EX}? אני עשיתי יותר אתמול. סתם, לא רשמתי.',
      female: '{REPS} {EX}? אני עשיתי יותר אתמול. סתם, לא רשמתי.',
    },
    neutral: {
      male: 'נשמר: {REPS} {EX}',
      female: 'נשמר: {REPS} {EX}',
    },
  },

  // ─── Workout reminder notification (used by 17-notifications.jsx) ──
  // Two-line format expected: title || body (split on '||' at runtime)
  workout_reminder: {
    polish_mom: {
      male: 'תזמן לי אימון||אלון, הגוף שלך לא נכנס לכושר לבד. תזכור שכבר היית פעם בכושר טוב.',
      female: 'תזמני לי אימון||מותק, הגוף שלך לא נכנס לכושר לבד. תזכרי שכבר היית פעם בכושר טוב.',
    },
    salesman: {
      male: 'אימון = השקעה||אלון, היום זה היום של ה-deposit. 30 דק׳ בכושר = ROI ארוך טווח.',
      female: 'אימון = השקעה||מירב, היום זה היום של ה-deposit. 30 דק׳ בכושר = ROI ארוך טווח.',
    },
    cynic_coach: {
      male: 'זמן לזוז||היה כתוב פה אימון. אז לזוז. או לעדכן את הלוח.',
      female: 'זמן לזוז||היה כתוב פה אימון. אז לזוז. או לעדכן את הלוח.',
    },
    jealous_friend: {
      male: 'הזכרתי לעצמי גם||יום אימון. גם אני לא הולך, אבל לפחות לי אין אפליקציה שתזכיר.',
      female: 'הזכרתי לעצמי גם||יום אימון. גם אני לא הולכת, אבל לפחות לי אין אפליקציה שתזכיר.',
    },
    neutral: {
      male: 'תזכורת אימון||הגיע מועד האימון המתוכנן.',
      female: 'תזכורת אימון||הגיע מועד האימון המתוכנן.',
    },
  },
};

// ─── Sincerity moments: every N interactions, persona drops the mask once ─
// N = 20 (configurable). Returns null if it's not a sincerity moment.
const SINCERITY_EVERY = 20;

const SINCERITY_LINES = {
  polish_mom: {
    male: 'אלון... תקשיב רגע. אני באמת גאה בך. אבא היה גאה.',
    female: 'מירב... תקשיבי רגע. אני באמת גאה בך. אמא הייתה גאה.',
  },
  salesman: {
    male: 'אלון, די עם המכירות. באמת — אתה עושה עבודה טובה.',
    female: 'מירב, די עם המכירות. באמת — את עושה עבודה טובה.',
  },
  cynic_coach: {
    male: 'תשמע. ברצינות. אתה עושה את זה טוב. תמשיך.',
    female: 'תשמעי. ברצינות. את עושה את זה טוב. תמשיכי.',
  },
  jealous_friend: {
    male: 'אחי, תשמע. באמת. אני מעריך אותך. תמשיך, אל תאבד את זה.',
    female: 'אחותי, תשמעי. באמת. אני מעריכה אותך. תמשיכי, אל תאבדי את זה.',
  },
  // neutral never gets sincerity — it's already sincere
};

function getSincerityLine(state) {
  const personaId = state?.settings?.persona || 'neutral';
  if (personaId === 'neutral') return null;

  const counter = state?.settings?.personaInteractions || 0;
  // Fire on interaction count 20, 40, 60, ...
  if (counter > 0 && counter % SINCERITY_EVERY === 0) {
    const gender = state?.user?.gender === 'female' ? 'female' : 'male';
    const name = (state?.user?.name || '').trim();
    const linesForPersona = SINCERITY_LINES[personaId];
    if (!linesForPersona) return null;
    let line = linesForPersona[gender] || linesForPersona.male;
    if (name) {
      const placeholder = gender === 'female' ? 'מירב' : 'אלון';
      if (name !== placeholder) {
        line = line.replace(new RegExp(placeholder, 'g'), name);
      }
    }
    return line;
  }
  return null;
}

// ─── Resolve a UI string for current user's persona + gender + name ───
// vars: optional { X: 5, Y: 2, ... } to substitute {X}, {Y}, etc. in the template.
// Substitution is literal — vars are coerced to String at render time.
function personaStr(state, key, fallback = '', vars = null) {
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const name = (state?.user?.name || '').trim();

  const entry = STRINGS[key];
  if (!entry) return interpolateVars(fallback, vars);

  const personaEntry = entry[personaId] || entry.neutral;
  if (!personaEntry) return interpolateVars(fallback, vars);

  let text = personaEntry[gender] || personaEntry.male || fallback;

  // Runtime name substitution
  if (name) {
    const placeholder = gender === 'female' ? 'מירב' : 'אלון';
    if (name !== placeholder) {
      text = text.replace(new RegExp(placeholder, 'g'), name);
    }
  }

  return interpolateVars(text, vars);
}

// ─── Substitute {X}, {Y}, etc. in a template string ─────────────────
// Used by personaStr; safe to call with null/undefined vars (returns text as-is).
function interpolateVars(text, vars) {
  if (!vars || !text) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
  });
}
