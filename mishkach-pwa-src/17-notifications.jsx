// ════════════════════════════════════════════════════════════════════
// 17-notifications.jsx — Local daily weigh-in reminders
// ════════════════════════════════════════════════════════════════════
// Uses Notification API + setTimeout for in-session reminder.
// For persistent reminders while app is closed, SW must be registered
// and scheduled via showNotification from service worker on schedule
// (we do best-effort local notification; proper push requires server).

function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (_) { return 'denied'; }
}

// ─── Message generator based on persona ─────────────────────────────
function getReminderMessage(personaId) {
  const messages = {
    polish_mom: [
      { title: 'שקלת היום?', body: 'אני לא רוצה ללחוץ עליך, אבל גם לא רוצה שתגיד אחר כך שלא הזכרתי.' },
      { title: 'ילד, בוקר טוב', body: 'המאזניים מחכה לך. קום, תעלה, וזהו. שלוש שניות.' },
      { title: 'עוד לא שקלת', body: 'אני יודעת שאתה עסוק. גם אבא שלך היה עסוק. גם הוא היה שוקל.' },
    ],
    salesman: [
      { title: 'השקילה = 30 שניות. Streak = חודשים', body: 'אל תסכן את ההשקעה עכשיו.' },
      { title: 'Data gap', body: 'יום בלי שקילה = נקודה חסרה בגרף. הנתונים עובדים בשבילך רק אם הם מלאים.' },
      { title: 'Opportunity cost', body: '30 שניות להשקיע. היום. עכשיו.' },
    ],
    cynic_coach: [
      { title: 'שקלת היום?', body: 'אם כן, תתעלם מההודעה. אם לא, אתה יודע.' },
      { title: 'עוד יום', body: 'אותה שגרה. מאזניים. 3 שניות. תמשיך.' },
      { title: 'אפס דרמה', body: 'שקול. המשך.' },
    ],
    jealous_friend: [
      { title: 'היי, נזכרת ממני פתאום?', body: 'עבר בוקר ולא שקלת. מה קרה, שכחת שאתה "רציני" עכשיו?' },
      { title: 'ה-streak שלך', body: 'אם תפספס אני מודיע לכולם. אז תזוז.' },
      { title: 'בוקר', body: 'אתה יודע שאני לא מתקשר סתם. תעלה על המאזניים.' },
    ],
    neutral: [
      { title: 'תזכורת שקילה', body: 'זמן לשקילה היומית.' },
      { title: 'שקילה', body: 'לא נשקלת היום.' },
      { title: 'שקילה יומית', body: 'הגיע זמן המדידה הקבוע.' },
    ],
  };
  const set = messages[personaId] || messages.neutral;
  return set[Math.floor(Math.random() * set.length)];
}

// ─── Show immediate local notification ──────────────────────────────
function showLocalNotification(title, body, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: './icon-192.png',
      badge: './favicon.png',
      tag: 'fitracklon-reminder',
      renotify: true,
      ...options,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn('[Mishkalut] notification failed', e);
  }
}

// ─── Schedule daily reminder — uses setTimeout while app is open,
//     persists intent so next open can compute if missed ───────────
function scheduleNextReminder(hhmm, personaId, alreadyWeighedToday) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;
  // Only schedule if within reasonable range (6 hours) to avoid orphan timers
  if (delay > 6 * 3600 * 1000) return null;
  const timeoutId = setTimeout(() => {
    const msg = getReminderMessage(personaId);
    showLocalNotification(msg.title, msg.body);
  }, delay);
  return timeoutId;
}

// ─── Notifications settings UI section ──────────────────────────────
function NotificationsSettingsDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const n = state.settings.notifications;
  const [enabled, setEnabled] = React.useState(n.enabled);
  const [time, setTime] = React.useState(n.weighTime || '08:00');
  const [permission, setPermission] = React.useState(
    isNotificationSupported() ? Notification.permission : 'unsupported'
  );

  const handleEnable = async () => {
    if (!isNotificationSupported()) {
      toast('הדפדפן שלך לא תומך בהתראות', { type: 'error' });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      // Test notification
      const msg = getReminderMessage(state.settings.persona || 'neutral');
      showLocalNotification(msg.title, msg.body);
      toast(personaStr(state, 'notification_enabled', 'התראות הופעלו'), { type: 'success' });
    } else if (result === 'denied') {
      toast('הרשאה נדחתה. אפשר מהגדרות הדפדפן', { type: 'error' });
    }
  };

  const save = () => {
    dispatch({
      type: 'SET_NOTIFICATIONS',
      updates: { enabled: enabled && permission === 'granted', weighTime: time },
    });
    toast('ההגדרות נשמרו', { type: 'success' });
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 400, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>תזכורת שקילה</div>
        <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 16, lineHeight: 1.6 }}>
          מומלץ: פעם בשבוע באותו יום ובאותה שעה. שקילה יומית אפשרית אך לא נחוצה — ממוצע שבועי נותן תמונה יציבה יותר.
        </div>

        {permission !== 'granted' && (
          <div style={{
            padding: 14, background: `${T.amber}15`, border: `1px solid ${T.amber}44`,
            borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: T.amber, marginBottom: 8 }}>
              {permission === 'denied' ? 'הרשאה נדחתה' : 'דרוש אישור'}
            </div>
            <button onClick={handleEnable} disabled={permission === 'denied'} style={{
              padding: '8px 14px', background: T.amber, color: T.bg, border: 'none',
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
              opacity: permission === 'denied' ? 0.5 : 1,
            }}>
              {permission === 'denied' ? 'חסום בדפדפן' : 'אפשר התראות'}
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: T.lime }} />
              <div style={{ fontSize: 14 }}>הפעל התראות יומיות</div>
            </div>

            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שעת תזכורת</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
              width: '100%', padding: '12px 14px', background: T.bg,
              border: `1px solid ${T.stroke}`, borderRadius: 10,
              color: T.ink, fontSize: 15, fontFamily: T.mono, outline: 'none',
              direction: 'ltr', textAlign: 'left',
            }} />
          </>
        )}

        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 14, lineHeight: 1.6 }}>
          הקול של התזכורת יתאים לפרסונה שבחרת.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save}>שמור</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Workout reminder — persona-aware via STRINGS['workout_reminder'] ──
// Format in 18-strings: 'title||body'. Falls back to neutral copy if missing.
function getWorkoutReminderMessage(state) {
  const fallbackTitle = 'תזכורת אימון';
  const fallbackBody = 'הגיע מועד האימון המתוכנן.';
  const raw = personaStr(state, 'workout_reminder', `${fallbackTitle}||${fallbackBody}`);
  const [title, body] = (raw || '').split('||');
  return {
    title: (title || fallbackTitle).trim(),
    body: (body || fallbackBody).trim(),
  };
}

// Schedule the workout reminder for the rest of TODAY only, if all conditions hold.
// Returns a timeoutId or null.
function scheduleNextWorkoutReminder(reminder, state, workedOutToday) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;
  if (!reminder || !reminder.enabled) return null;
  const days = Array.isArray(reminder.days) ? reminder.days : [];
  if (days.length === 0) return null;

  const now = new Date();
  if (!days.includes(now.getDay())) return null; // not a scheduled day
  if (workedOutToday) return null;                // already done — skip

  const [h, m] = (reminder.time || '17:00').split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) return null;                 // already past for today
  const delay = target - now;
  if (delay > 6 * 3600 * 1000) return null;       // out of in-session range; will retry on next open

  return setTimeout(() => {
    const msg = getWorkoutReminderMessage(state);
    showLocalNotification(msg.title, msg.body, { tag: 'fitracklon-workout-reminder' });
  }, delay);
}

// ─── Workout reminder settings dialog (shape: { enabled, days, time }) ──
function WorkoutReminderDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const r = state.settings.workoutReminder || { enabled: false, days: [], time: '17:00' };
  const [enabled, setEnabled] = React.useState(!!r.enabled);
  const [days, setDays] = React.useState(Array.isArray(r.days) ? r.days : []);
  const [time, setTime] = React.useState(r.time || '17:00');
  const [permission, setPermission] = React.useState(
    isNotificationSupported() ? Notification.permission : 'unsupported'
  );

  const dayLabels = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  const toggleDay = (d) => {
    setDays(curr => curr.includes(d) ? curr.filter(x => x !== d) : [...curr, d].sort());
  };

  const handleEnable = async () => {
    if (!isNotificationSupported()) {
      toast('הדפדפן שלך לא תומך בהתראות', { type: 'error' });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      const msg = getWorkoutReminderMessage(state);
      showLocalNotification(msg.title, msg.body, { tag: 'fitracklon-workout-reminder-test' });
    } else if (result === 'denied') {
      toast('הרשאה נדחתה. אפשר מהגדרות הדפדפן', { type: 'error' });
    }
  };

  const save = () => {
    dispatch({
      type: 'SET_SETTING',
      key: 'workoutReminder',
      value: {
        enabled: enabled && permission === 'granted' && days.length > 0,
        days,
        time,
      },
    });
    toast('תזכורת האימון נשמרה', { type: 'success' });
    onClose();
  };

  const canSave = !enabled || (days.length > 0 && permission === 'granted');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 400, width: '100%', direction: 'rtl', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>תזכורת אימון</div>
        <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 16, lineHeight: 1.6 }}>
          תזכורת ניפרדת מהשקילה — בימים שתבחר, בשעה הקבועה. אם כבר הזנת אימון באותו יום, התזכורת לא תופיע.
        </div>

        {permission !== 'granted' && (
          <div style={{
            padding: 14, background: `${T.amber}15`, border: `1px solid ${T.amber}44`,
            borderRadius: 10, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: T.amber, marginBottom: 8 }}>
              {permission === 'denied' ? 'הרשאה נדחתה' : 'דרוש אישור'}
            </div>
            <button onClick={handleEnable} disabled={permission === 'denied'} style={{
              padding: '8px 14px', background: T.amber, color: T.bg, border: 'none',
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
              opacity: permission === 'denied' ? 0.5 : 1,
            }}>
              {permission === 'denied' ? 'חסום בדפדפן' : 'אפשר התראות'}
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: T.lime }} />
              <div style={{ fontSize: 14 }}>הפעל תזכורת אימון</div>
            </div>

            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 8, fontFamily: T.mono, letterSpacing: 1 }}>ימי שבוע</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
              {dayLabels.map((label, d) => {
                const on = days.includes(d);
                return (
                  <button key={d} onClick={() => toggleDay(d)} style={{
                    padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                    background: on ? T.lime : T.bgElev2,
                    color: on ? T.bg : T.inkSub,
                    border: 'none',
                    fontFamily: T.font, fontSize: 12, fontWeight: 700,
                  }}>{label}</button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שעת תזכורת</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
              width: '100%', padding: '12px 14px', background: T.bg,
              border: `1px solid ${T.stroke}`, borderRadius: 10,
              color: T.ink, fontSize: 15, fontFamily: T.mono, outline: 'none',
              direction: 'ltr', textAlign: 'left',
            }} />

            {enabled && days.length === 0 && (
              <div style={{ marginTop: 12, fontSize: 11, color: T.amber }}>
                בחר לפחות יום אחד.
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 14, lineHeight: 1.6 }}>
          הקול של התזכורת יתאים לפרסונה שבחרת.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={!canSave}>שמור</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook: auto-schedule reminders on app load if enabled ───────────
function useNotificationScheduler() {
  const { state } = useStore();
  const n = state.settings.notifications;
  const wReminder = state.settings.workoutReminder;
  const personaId = state.settings.persona || 'neutral';
  const today = todayISO();
  // entries is an object keyed by date, not an array
  const weighedToday = !!(state.entries && state.entries[today]);
  const workedOutToday = !!(state.workouts && state.workouts.sessions && state.workouts.sessions[today] && state.workouts.sessions[today].length);

  // Weight reminder (existing)
  React.useEffect(() => {
    if (!n || !n.enabled || !isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;
    if (weighedToday) return;
    const timeoutId = scheduleNextReminder(n.weighTime, personaId, weighedToday);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [n?.enabled, n?.weighTime, personaId, weighedToday]);

  // Workout reminder (new)
  React.useEffect(() => {
    if (!wReminder || !wReminder.enabled) return;
    const timeoutId = scheduleNextWorkoutReminder(wReminder, state, workedOutToday);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [wReminder?.enabled, wReminder?.time, JSON.stringify(wReminder?.days || []), personaId, workedOutToday]);
}
