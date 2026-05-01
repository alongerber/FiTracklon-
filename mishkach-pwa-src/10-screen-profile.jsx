// ════════════════════════════════════════════════════════════════════
// 10-screen-profile.jsx — Profile, settings, export/import, reset
// ════════════════════════════════════════════════════════════════════

function ProfileScreen({ onNavigate }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showApiConfig, setShowApiConfig] = React.useState(false);
  const [showUsage, setShowUsage] = React.useState(false);
  const [showTips, setShowTips] = React.useState(false);
  const [showPersona, setShowPersona] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showWorkoutReminder, setShowWorkoutReminder] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const currentPersona = state.settings.persona || 'neutral';
  const personaLabel = PERSONAS[currentPersona]?.name || 'ישיר';

  const handleExport = () => {
    const data = {
      ...state,
      exportedAt: new Date().toISOString(),
      exportedBy: 'mishkach-pwa',
    };
    // Strip the API key on export for safety
    if (data.apiConfig) data.apiConfig = { ...data.apiConfig, key: '', sharedPassword: '' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mishkach-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('הורדת גיבוי (ללא מפתח API)', { type: 'success' });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!imported.entries && !imported.user) throw new Error('Invalid structure');
          // Preserve current API key on import
          imported.apiConfig = { ...imported.apiConfig, key: state.apiConfig.key, sharedPassword: state.apiConfig.sharedPassword };
          dispatch({ type: 'IMPORT_STATE', state: imported });
          toast('הנתונים יובאו בהצלחה', { type: 'success' });
        } catch (err) {
          toast('קובץ לא תקין', { type: 'error' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_ALL' });
    setConfirmReset(false);
    toast('כל הנתונים נמחקו', { type: 'info' });
  };

  const entries = Object.keys(state.entries).length;
  const daysActive = state.user.startDate
    ? daysBetweenISO(state.user.startDate, todayISO()) + 1
    : 0;

  const month = todayISO().slice(0, 7);
  const monthUsage = state.usage.byMonth[month] || { requests: 0, costUSD: 0 };
  const isShared = state.apiConfig.mode === 'shared';
  const secretSet = isShared ? !!state.apiConfig.sharedPassword : !!state.apiConfig.key;
  const apiRowValue = !secretSet
    ? 'לא הוגדר'
    : isShared
      ? `משותף · ••${state.apiConfig.sharedPassword.slice(-3)}`
      : `אישי · ••••${state.apiConfig.key.slice(-4)}`;

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>PROFILE</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>פרופיל והגדרות</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 20px' }}>
        {/* User card */}
        <Card padding={16} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarDot letter={(state.user.name || 'U')[0]} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{state.user.name || 'ללא שם'}</div>
              <div style={{ fontSize: 12, color: T.inkSub, fontFamily: T.mono, marginTop: 2 }}>
                {state.user.heightCm} ס״מ · {state.user.ageYears} שנים · {daysActive} ימים במעקב
              </div>
            </div>
            <button onClick={() => setShowEdit(true)} style={{
              background: T.bgElev2, border: 'none', color: T.ink, cursor: 'pointer',
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: T.font,
            }}>ערוך</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.stroke}` }}>
            <StatMini label="מדידות" value={entries} />
            <StatMini label="רצף" value={`${stats.streak} ימים`} />
            <StatMini label="ירידה" value={stats.empty ? '—' : `${(state.user.startWeight - stats.current).toFixed(1)}`} unit="ק״ג" />
          </div>
        </Card>

        {/* Goal summary */}
        <Section title="יעד">
          <RowItem icon={<TabIcon name="target" size={18} />} label="משקל יעד"
            value={state.goal.weight !== null ? `${fmt.kg(state.goal.weight, state.settings.unit)} ${fmt.unitLabel(state.settings.unit)}` : 'לא מוגדר'}
            onClick={() => onNavigate('goal')} />
          {state.goal.weight !== null && (
            <RowItem icon={<TabIcon name="bolt" size={18} />} label="קצב" value={PACE_CONFIG[state.goal.pace]?.label || 'מאוזן'} onClick={() => onNavigate('goal')} />
          )}
        </Section>

        {/* AI */}
        <Section title="תובנות AI">
          <RowItem icon={<TabIcon name="key" size={18} />} label="מפתח / קוד גישה"
            value={apiRowValue} onClick={() => setShowApiConfig(true)} />
          <RowItem icon={<TabIcon name="wallet" size={18} />} label="שימוש החודש"
            value={`$${monthUsage.costUSD.toFixed(3)} · ${monthUsage.requests} בקשות`}
            onClick={() => setShowUsage(true)} />
        </Section>

        {/* Persona & Notifications */}
        <Section title="אופי האפליקציה">
          <RowItem icon={<TabIcon name="user" size={18} />} label="מי מלווה אותך"
            value={personaLabel} onClick={() => setShowPersona(true)} />
          <RowItem icon={<TabIcon name="sparkle" size={18} />} label="תזכורת שקילה"
            value={state.settings.notifications?.enabled ? (state.settings.notifications.weighTime || '08:00') : 'כבוי'}
            onClick={() => setShowNotifications(true)} />
          <RowItem icon={<TabIcon name="dumbbell" size={18} />} label="תזכורת אימון"
            value={(() => {
              const r = state.settings.workoutReminder;
              if (!r || !r.enabled || !(r.days || []).length) return 'כבוי';
              const labels = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
              const dayStr = (r.days || []).slice().sort().map(d => labels[d]).join(',');
              return `${dayStr} · ${r.time || '17:00'}`;
            })()}
            onClick={() => setShowWorkoutReminder(true)} />
        </Section>

        {/* Install app */}
        <InstallPromptSection />

        {/* Tips Library */}
        <Section title="טיפים ותובנות">
          <RowItem icon={<TabIcon name="lightbulb" size={18} />} label="ספריית טיפים"
            value={`${CREATIVE_TIPS.length} תובנות × 5 קולות`} onClick={() => setShowTips(true)} />
        </Section>

        {/* Personal report */}
        <Section title="דוחות">
          <RowItem icon={<TabIcon name="share" size={18} />} label="📄 צור דוח אישי"
            value="לרופא · למאמן · לעצמי" onClick={() => setShowReport(true)} />
        </Section>

        {/* Settings */}
        <Section title="הגדרות">
          <RowItem icon={<TabIcon name="ruler" size={18} />} label="יחידת מדידה" right={
            <UnitToggle unit={state.settings.unit} onChange={(u) => dispatch({ type: 'SET_SETTING', key: 'unit', value: u })} />
          } />
          <RowItem icon={<TabIcon name="palette" size={18} />} label="תצוגת בית" right={
            <VariantToggle value={state.settings.homeVariant} onChange={(v) => {
              dispatch({ type: 'SET_SETTING', key: 'homeVariant', value: v });
              toast('תצוגה הוחלפה', { type: 'info' });
            }} />
          } />
        </Section>

        {/* Data */}
        <Section title="נתונים">
          <RowItem icon={<TabIcon name="download-inv" size={18} />} label="ייצוא JSON" onClick={handleExport} />
          <RowItem icon={<TabIcon name="upload" size={18} />} label="ייבוא מגיבוי" onClick={handleImport} />
          <RowItem icon={<TabIcon name="trash" size={18} />} label="מחק הכל" danger onClick={() => setConfirmReset(true)} />
        </Section>

        <div style={{ textAlign: 'center', fontSize: 10, color: T.inkMute, marginTop: 20, fontFamily: T.mono }}>
          מִשְׁקַלּוּת · v3.1
        </div>
      </div>

      {showEdit && <EditProfileDialog onClose={() => setShowEdit(false)} />}
      {showApiConfig && <ApiConfigDialog onClose={() => setShowApiConfig(false)} />}
      {showUsage && <UsageDetailsDialog onClose={() => setShowUsage(false)} />}
      {showTips && <CreativeTipsLibrary onClose={() => setShowTips(false)} />}
      {showPersona && <PersonaPickerDialog onClose={() => setShowPersona(false)} />}
      {showNotifications && <NotificationsSettingsDialog onClose={() => setShowNotifications(false)} />}
      {showWorkoutReminder && <WorkoutReminderDialog onClose={() => setShowWorkoutReminder(false)} />}
      {showReport && <ReportScreen onClose={() => setShowReport(false)} />}

      <ConfirmDialog
        open={confirmReset}
        title="למחוק את כל הנתונים?"
        message="כל המדידות, הארוחות, היעד וההגדרות יימחקו לצמיתות. פעולה זו לא ניתנת לביטול."
        confirmLabel="מחק הכל"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <Card padding={0} style={{ overflow: 'hidden' }}>{children}</Card>
    </div>
  );
}

function RowItem({ icon, label, value, right, onClick, danger = false }) {
  const iconColor = danger ? T.rose : T.lime;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: `1px solid ${T.stroke}`,
      color: danger ? T.rose : T.ink,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: `${iconColor}18`, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{label}</div>
      {value && <div style={{ fontSize: 13, color: T.inkSub, fontFamily: T.mono }}>{value}</div>}
      {right}
      {onClick && !right && !danger && <span style={{ color: T.inkMute, fontSize: 18 }}>‹</span>}
    </div>
  );
}

function StatMini({ label, value, unit }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 17, fontWeight: 700, color: T.ink, marginTop: 2 }}>
        {value}{unit && <span style={{ fontSize: 10, color: T.inkMute }}> {unit}</span>}
      </div>
    </div>
  );
}

function UnitToggle({ unit, onChange }) {
  return (
    <div style={{ display: 'flex', background: T.bgElev2, borderRadius: 8, padding: 2 }}>
      {['kg','lb'].map(u => (
        <button key={u} onClick={() => onChange(u)} style={{
          padding: '4px 10px', border: 'none', cursor: 'pointer',
          background: unit === u ? T.lime : 'transparent',
          color: unit === u ? T.bg : T.inkSub, borderRadius: 6,
          fontFamily: T.mono, fontSize: 11, fontWeight: 700,
        }}>{u === 'kg' ? 'ק״ג' : 'lb'}</button>
      ))}
    </div>
  );
}

function VariantToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', background: T.bgElev2, borderRadius: 8, padding: 2 }}>
      {['v1','v2','v3'].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '4px 10px', border: 'none', cursor: 'pointer',
          background: value === v ? T.lime : 'transparent',
          color: value === v ? T.bg : T.inkSub, borderRadius: 6,
          fontFamily: T.mono, fontSize: 11, fontWeight: 700,
        }}>{v.toUpperCase()}</button>
      ))}
    </div>
  );
}

// ─── Edit profile dialog ────────────────────────────────────────────
function EditProfileDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const [name, setName] = React.useState(state.user.name);
  const [heightCm, setHeightCm] = React.useState(state.user.heightCm);
  const [ageYears, setAgeYears] = React.useState(state.user.ageYears || 35);
  const [gender, setGender] = React.useState(state.user.gender || 'male');

  const save = () => {
    dispatch({ type: 'SET_USER', user: { name: name.trim(), heightCm, ageYears, gender } });
    // Recalculate nutrition goals if on auto mode
    if (state.nutrition.goals.source === 'auto') {
      const auto = calculateNutritionGoals({ ...state.user, heightCm, ageYears, gender }, state.goal, state.entries[state.user.startDate]?.weight || state.user.startWeight);
      dispatch({ type: 'SET_NUTRITION_GOALS', goals: { ...auto, source: 'auto' } });
    }
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 20, maxWidth: 360, width: '100%', direction: 'rtl', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>עריכת פרופיל</div>

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שם</div>
        <input value={name} onChange={e => setName(e.target.value)} style={{
          width: '100%', padding: '12px 14px', background: T.bg, border: `1px solid ${T.stroke}`,
          borderRadius: 10, color: T.ink, fontSize: 15, fontFamily: T.font, outline: 'none',
          direction: 'rtl', textAlign: 'right', marginBottom: 16,
        }} />

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>מין</div>
        <div style={{ display: 'flex', background: T.bgElev2, borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {[['male','זכר'],['female','נקבה']].map(([v, label]) => (
            <button key={v} onClick={() => setGender(v)} style={{
              flex: 1, padding: 8, border: 'none', cursor: 'pointer',
              background: gender === v ? T.lime : 'transparent',
              color: gender === v ? T.bg : T.inkSub, borderRadius: 8,
              fontFamily: T.font, fontSize: 12, fontWeight: 700,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>גיל</div>
            <NumberStepper value={ageYears} onChange={setAgeYears} min={16} max={90} step={1} unit="" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>גובה</div>
            <NumberStepper value={heightCm} onChange={setHeightCm} min={120} max={230} step={1} unit="ס״מ" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save}>שמור</Button>
        </div>
      </div>
    </div>
  );
}

// ─── API config dialog ──────────────────────────────────────────────
function ApiConfigDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [mode, setMode] = React.useState(state.apiConfig.mode || 'direct');
  const [key, setKey] = React.useState(state.apiConfig.key || '');
  const [password, setPassword] = React.useState(state.apiConfig.sharedPassword || '');
  const [showSecret, setShowSecret] = React.useState(false);

  const save = () => {
    dispatch({ type: 'SET_API_MODE', mode });
    if (mode === 'direct') {
      dispatch({ type: 'SET_API_KEY', key: key.trim() });
    } else {
      dispatch({ type: 'SET_SHARED_PASSWORD', password: password.trim() });
    }
    toast('נשמר', { type: 'success' });
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
        padding: 22, maxWidth: 400, width: '100%', direction: 'rtl', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>תובנות AI</div>
        <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 16, lineHeight: 1.6 }}>
          שני מצבים: שימוש במפתח אישי שלך, או שימוש משותף עם קוד גישה.
        </div>

        {/* Mode toggle */}
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>מצב</div>
        <div style={{ display: 'flex', background: T.bgElev2, borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {[
            ['direct', 'אישי', 'API key שלי'],
            ['shared', 'משותף', 'קוד גישה'],
          ].map(([v, label, sub]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer',
              background: mode === v ? T.lime : 'transparent',
              color: mode === v ? T.bg : T.inkSub, borderRadius: 8,
              fontFamily: T.font, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: 10, opacity: 0.85 }}>{sub}</span>
            </button>
          ))}
        </div>

        {mode === 'direct' ? (
          <>
            <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 12, lineHeight: 1.6 }}>
              המפתח נשמר מקומית בלבד. לא נשלח לשום שרת חוץ מ-api.anthropic.com.
              <br />קבל מפתח ב-<span style={{ color: T.lime, fontFamily: T.mono }}>console.anthropic.com</span>.
            </div>
            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>API key</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={secretInputStyle}
              />
              <button onClick={() => setShowSecret(s => !s)} style={secretToggleStyle}>{showSecret ? '🙈' : '👁'}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 12, lineHeight: 1.6 }}>
              השימוש מתחבר דרך שרת פרטי שמחזיק מפתח משותף עם <strong>תקרה שבועית $2</strong>.
              אל תשתף את הקוד עם אנשים שאתה לא סומך עליהם.
            </div>
            <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קוד גישה</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="הזן את הקוד שקיבלת"
                inputMode="numeric"
                style={secretInputStyle}
              />
              <button onClick={() => setShowSecret(s => !s)} style={secretToggleStyle}>{showSecret ? '🙈' : '👁'}</button>
            </div>
          </>
        )}

        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 14, lineHeight: 1.6 }}>
          <div>מודלים: <span style={{ color: T.ink, fontFamily: T.mono }}>Sonnet 4.6</span> לטקסט · <span style={{ color: T.ink, fontFamily: T.mono }}>Opus 4.7</span> לתמונות ותובנות</div>
          <div style={{ marginTop: 4 }}>אופטימיזציה אוטומטית של איכות מול עלות</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save}>שמור</Button>
        </div>
      </div>
    </div>
  );
}

const secretInputStyle = {
  width: '100%', padding: '12px 14px', paddingLeft: 40,
  background: T.bg, border: `1px solid ${T.stroke}`, borderRadius: 10,
  color: T.ink, fontSize: 13, fontFamily: T.mono, outline: 'none',
  direction: 'ltr', textAlign: 'left',
};
const secretToggleStyle = {
  position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
  background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer',
  padding: 6, fontSize: 14,
};

// ─── Usage details dialog ───────────────────────────────────────────
function UsageDetailsDialog({ onClose }) {
  const { state } = useStore();
  const u = state.usage;
  const month = todayISO().slice(0, 7);
  const monthData = u.byMonth[month] || { requests: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
  const features = Object.entries(u.byFeature);

  const featureLabels = {
    nutrition_text: 'תזונה · טקסט',
    nutrition_image: 'תזונה · תמונה',
    weekly_insight: 'תובנה שבועית',
    plateau_analysis: 'אבחון plateau',
    goal_calibration: 'כיול יעדים',
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 380, width: '100%', direction: 'rtl', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>שימוש במנוע</div>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, marginBottom: 16 }}>OPUS 4.7 · $5/$25 per MTok</div>

        <Card padding={14} style={{ marginBottom: 12, background: `${T.lime}10`, border: `1px solid ${T.lime}40` }}>
          <div style={{ fontSize: 10, color: T.inkSub, fontFamily: T.mono, letterSpacing: 1 }}>החודש ({month})</div>
          <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.lime, letterSpacing: -1, marginTop: 4 }}>
            ${monthData.costUSD.toFixed(3)}
          </div>
          <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 4 }}>
            {monthData.requests} בקשות · {(monthData.inputTokens/1000).toFixed(1)}K in · {(monthData.outputTokens/1000).toFixed(1)}K out
          </div>
        </Card>

        <Card padding={14} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: T.inkSub, fontFamily: T.mono, letterSpacing: 1 }}>כל הזמן</div>
          <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: -1, marginTop: 4 }}>
            ${u.allTime.costUSD.toFixed(3)}
          </div>
          <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 4 }}>
            {u.allTime.requests} בקשות
          </div>
        </Card>

        {features.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>לפי פיצ׳ר</div>
            <Card padding={0}>
              {features.map(([key, v], i) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < features.length - 1 ? `1px solid ${T.stroke}` : 'none',
                }}>
                  <div style={{ fontSize: 13 }}>{featureLabels[key] || key}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.inkSub }}>
                    {v.count} · ${v.costUSD.toFixed(3)}
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>סגור</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Install prompt section in profile ──────────────────────────────
function InstallPromptSection() {
  const { canInstall, isInstalled, isIOS } = useInstallPrompt();
  if (isInstalled) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <Card padding={14} style={{
      marginBottom: 14,
      background: `linear-gradient(135deg, ${T.lime}15 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${T.lime}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>📱</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>התקן כאפליקציה</div>
          <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>
            גישה מהירה ממסך הבית · עובד offline
          </div>
        </div>
      </div>
      <InstallButton />
    </Card>
  );
}

// ─── Persona picker dialog ──────────────────────────────────────────
function PersonaPickerDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [selected, setSelected] = React.useState(state.settings.persona || 'neutral');

  const save = () => {
    dispatch({ type: 'SET_PERSONA', persona: selected });
    toast(`בחרת: ${PERSONAS[selected].name}`, { type: 'success' });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 830,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>אופי האפליקציה</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 16, lineHeight: 1.6 }}>
          כל השינוי ישנה את הטון של ההודעות, הטיפים, וההתראות. נתונים לא משתנים.
        </div>
        <PersonaSelector selected={selected} onSelect={setSelected} />
        <div style={{ marginTop: 24 }}>
          <Button onClick={save}>החלף לקול הזה</Button>
        </div>
      </div>
    </div>
  );
}
