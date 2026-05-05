// ════════════════════════════════════════════════════════════════════
// 05-screen-onboarding.jsx — First launch onboarding
// ════════════════════════════════════════════════════════════════════

function OnboardingScreen() {
  const { dispatch } = useStore();
  const [step, setStep] = React.useState(0);
  const [persona, setPersona] = React.useState('neutral');
  const [name, setName] = React.useState('');
  const [heightCm, setHeightCm] = React.useState(170);
  const [ageYears, setAgeYears] = React.useState(35);
  const [gender, setGender] = React.useState('male');
  const [currentWeight, setCurrentWeight] = React.useState(80.0);
  const [goalWeight, setGoalWeight] = React.useState(75.0);
  const [pace, setPace] = React.useState('balanced');
  const [unit, setUnit] = React.useState('kg');
  // AI setup (last step)
  const [aiMode, setAiMode] = React.useState('shared');
  const [sharedPw, setSharedPw] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => Math.max(0, s - 1));

  // v3.17: fire "Onboarding Started" once when this screen mounts
  React.useEffect(() => {
    trackEvent('Onboarding Started');
  }, []);

  const complete = () => {
    const toKg = (v) => unit === 'lb' ? v / 2.20462 : v;
    dispatch({ type: 'SET_PERSONA', persona });
    dispatch({
      type: 'COMPLETE_ONBOARDING',
      name: name.trim() || 'משתמש',
      heightCm, ageYears, gender,
      currentWeight: Math.round(toKg(currentWeight) * 10) / 10,
      goalWeight: Math.round(toKg(goalWeight) * 10) / 10,
      pace, unit,
    });
    if (aiMode === 'shared' && sharedPw.trim()) {
      dispatch({ type: 'SET_API_MODE', mode: 'shared' });
      dispatch({ type: 'SET_SHARED_PASSWORD', password: sharedPw.trim() });
    } else if (aiMode === 'direct' && apiKey.trim()) {
      dispatch({ type: 'SET_API_MODE', mode: 'direct' });
      dispatch({ type: 'SET_API_KEY', key: apiKey.trim() });
    }
    // v3.17: track conversion. Persona is one of the few non-PII signals
    // safe to attach (no name, no weight, no email).
    trackEvent('Onboarding Completed', { persona });
  };

  return (
    <div style={{
      background: T.bg, color: T.ink, fontFamily: T.font, direction: 'rtl',
      height: '100dvh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', gap: 6 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? T.lime : T.stroke,
            transition: 'background 200ms',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <PersonaStep persona={persona} setPersona={setPersona} onNext={next} onPrev={prev} />}
        {step === 2 && <NameHeightStep
          name={name} setName={setName}
          heightCm={heightCm} setHeightCm={setHeightCm}
          ageYears={ageYears} setAgeYears={setAgeYears}
          gender={gender} setGender={setGender}
          onNext={next} onPrev={prev}
        />}
        {step === 3 && <WeightStep
          unit={unit} setUnit={setUnit}
          currentWeight={currentWeight} setCurrentWeight={setCurrentWeight}
          goalWeight={goalWeight} setGoalWeight={setGoalWeight}
          onNext={next} onPrev={prev}
        />}
        {step === 4 && <PaceStep
          pace={pace} setPace={setPace}
          currentWeight={currentWeight} goalWeight={goalWeight} unit={unit}
          onNext={next} onPrev={prev}
        />}
        {step === 5 && <AiSetupStep
          mode={aiMode} setMode={setAiMode}
          sharedPw={sharedPw} setSharedPw={setSharedPw}
          apiKey={apiKey} setApiKey={setApiKey}
          onComplete={complete} onPrev={prev}
        />}
      </div>
    </div>
  );
}

// ─── Step 1: persona selection ──────────────────────────────────────
function PersonaStep({ persona, setPersona, onNext, onPrev }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>שלב 1 · האופי</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>מי ילווה אותך?</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginTop: 8, lineHeight: 1.6, marginBottom: 20 }}>
        האפליקציה תדבר איתך בקול שתבחר. תוכל להחליף מתי שתרצה מההגדרות.
      </div>

      <PersonaSelector selected={persona} onSelect={setPersona} />

      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext}>המשך</Button>
      </div>
    </div>
  );
}

// v3.13: replaced generic "ברוכים הבאים" + "5 שאלות" with a one-screen
// pact. The text sets honest expectations (what the app does, what the
// commitment is, what the user can do if it doesn't work). The "הוגן"
// CTA is the user's accept of that pact.
function WelcomeStep({ onNext }) {
  const bodyParaStyle = {
    fontSize: 15,
    lineHeight: 1.75,
    color: T.ink,
    margin: 0,
  };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100%', padding: '8px 4px 24px',
      direction: 'rtl',
    }}>
      {/* Logo — centered, 140×140 per spec */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, marginBottom: 28 }}>
        <img
          src="./logo-welcome.png"
          alt="מִשְׁקַלּוּת"
          style={{
            width: 140, height: 140, objectFit: 'contain',
            borderRadius: 30,
            boxShadow: `0 0 60px ${T.lime}44, 0 10px 30px rgba(0,0,0,0.5)`,
          }}
        />
      </div>

      {/* Title */}
      <div style={{
        fontSize: 38, fontWeight: 800, color: T.lime,
        letterSpacing: -1, lineHeight: 1.05,
        textAlign: 'center', marginBottom: 28,
      }}>
        מִשְׁקַלּוּת.
      </div>

      {/* Pact heading + body */}
      <div style={{
        fontSize: 18, fontWeight: 700, color: T.ink,
        marginBottom: 14, textAlign: 'right',
      }}>
        הסכם:
      </div>

      <p style={{ ...bodyParaStyle, marginBottom: 14 }}>
        יש כאן כלי שיודע לזהות אוכל מצילום, להבין משפט בעברית,
        ולתעד אימון מאמירה אחת. בקול שתבחרו מתוך חמש דמויות.
      </p>

      <p style={{ ...bodyParaStyle, marginBottom: 28 }}>
        תרשמו. אם זה יעזור — מצוין. אם לא — תמחקו את האפליקציה,
        ואני לא אעלב.
      </p>

      {/* "הוגן" CTA — 56px tall, full width */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <button
          onClick={() => { trackEvent('Agreement Accepted'); onNext(); }}
          style={{
            width: '100%', height: 56,
            background: T.lime, color: T.bg,
            border: 'none', borderRadius: 14,
            fontSize: 18, fontWeight: 800, fontFamily: T.font,
            letterSpacing: 0.5, cursor: 'pointer',
          }}>
          הוגן
        </button>
      </div>
    </div>
  );
}

function NameHeightStep({ name, setName, heightCm, setHeightCm, ageYears, setAgeYears, gender, setGender, onNext, onPrev }) {
  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>1/3</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>קצת עליך</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginTop: 6 }}>נתונים בסיסיים לחישוב מטרת תזונה</div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שם (לא חובה)</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="איך קוראים לך?"
          style={{
            width: '100%', padding: '14px 16px', background: T.bgElev, border: `1px solid ${T.stroke}`,
            borderRadius: 12, color: T.ink, fontSize: 16, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right',
          }}
          onFocus={e => e.target.style.borderColor = T.lime}
          onBlur={e => e.target.style.borderColor = T.stroke}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>מין</div>
        <div style={{ display: 'flex', background: T.bgElev2, borderRadius: 10, padding: 3 }}>
          {[['male','זכר'],['female','נקבה']].map(([v, label]) => (
            <button key={v} onClick={() => setGender(v)} style={{
              flex: 1, padding: 10, border: 'none', cursor: 'pointer',
              background: gender === v ? T.lime : 'transparent',
              color: gender === v ? T.bg : T.inkSub, borderRadius: 8,
              fontFamily: T.font, fontSize: 13, fontWeight: 700,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>גיל</div>
          <NumberStepper value={ageYears} onChange={setAgeYears} min={16} max={90} step={1} unit="" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>גובה</div>
          <NumberStepper value={heightCm} onChange={setHeightCm} min={120} max={230} step={1} unit="ס״מ" />
        </div>
      </div>

      <div style={{ marginTop: 36, display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext}>הבא</Button>
      </div>
    </div>
  );
}

function WeightStep({ unit, setUnit, currentWeight, setCurrentWeight, goalWeight, setGoalWeight, onNext, onPrev }) {
  const canProceed = goalWeight < currentWeight && goalWeight > (unit === 'lb' ? 66 : 30) && currentWeight < (unit === 'lb' ? 660 : 300);

  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    const factor = newUnit === 'lb' ? 2.20462 : 1 / 2.20462;
    setCurrentWeight(v => Math.round(v * factor * 10) / 10);
    setGoalWeight(v => Math.round(v * factor * 10) / 10);
    setUnit(newUnit);
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>2/3</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>המשקל שלך</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginTop: 6 }}>הזן את המשקל הנוכחי ואת היעד</div>

      <div style={{ marginTop: 20, display: 'flex', background: T.bgElev2, borderRadius: 10, padding: 3 }}>
        {['kg','lb'].map(u => (
          <button key={u} onClick={() => handleUnitChange(u)} style={{
            flex: 1, padding: 8, border: 'none', cursor: 'pointer',
            background: unit === u ? T.lime : 'transparent',
            color: unit === u ? T.bg : T.inkSub, borderRadius: 8,
            fontFamily: T.mono, fontSize: 12, fontWeight: 700,
          }}>{u === 'kg' ? 'ק״ג' : 'פאונד'}</button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>משקל נוכחי</div>
        <NumberStepper value={currentWeight} onChange={setCurrentWeight} min={unit === 'lb' ? 66 : 30} max={unit === 'lb' ? 660 : 300} step={unit === 'lb' ? 0.2 : 0.1} unit={fmt.unitLabel(unit)} />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>משקל יעד</div>
        <NumberStepper value={goalWeight} onChange={setGoalWeight} min={unit === 'lb' ? 66 : 30} max={unit === 'lb' ? 660 : 300} step={unit === 'lb' ? 0.2 : 0.1} unit={fmt.unitLabel(unit)} />
      </div>

      {!canProceed && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: `${T.rose}15`, border: `1px solid ${T.rose}44`, borderRadius: 10, fontSize: 12, color: T.rose }}>
          המשקל היעד חייב להיות נמוך מהנוכחי. אם המטרה היא לעלות במשקל, הפוך את המספרים.
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext} disabled={!canProceed}>הבא</Button>
      </div>
    </div>
  );
}

function PaceStep({ pace, setPace, currentWeight, goalWeight, unit, onNext, onPrev }) {
  const toKg = (v) => unit === 'lb' ? v / 2.20462 : v;
  const diffDisplay = Math.abs(currentWeight - goalWeight);
  const diffKg = Math.abs(toKg(currentWeight) - toKg(goalWeight));
  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>3/3</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>באיזה קצב?</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginTop: 6 }}>פער של {diffDisplay.toFixed(1)} {fmt.unitLabel(unit)} · בחר קצב ריאלי</div>

      <Col gap={10} style={{ marginTop: 24 }}>
        {Object.entries(PACE_CONFIG).map(([key, cfg]) => {
          const weeks = Math.ceil(diffKg / cfg.kgPerWeek);
          const sel = pace === key;
          return (
            <button key={key} onClick={() => setPace(key)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 16,
              border: `1px solid ${sel ? cfg.color : T.stroke}`,
              background: sel ? `${cfg.color}10` : T.bgElev,
              borderRadius: T.radius, cursor: 'pointer', textAlign: 'right',
              direction: 'rtl', fontFamily: T.font, color: T.ink,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                border: `2px solid ${sel ? cfg.color : T.stroke}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <div style={{ width: 10, height: 10, borderRadius: 5, background: cfg.color }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{cfg.label}</div>
                <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 2 }}>{cfg.kgPerWeek} ק״ג/שבוע</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 14, color: cfg.color, fontWeight: 700 }}>{weeks} שב׳</div>
            </button>
          );
        })}
      </Col>

      <div style={{ marginTop: 14, fontSize: 11, color: T.inkMute, lineHeight: 1.6 }}>
        קצב מאוזן (0.5 ק״ג/שבוע) הוא המומלץ הקליני לירידה בת־קיימא. קצב אגרסיבי יותר דורש הקפדה גבוהה ומתאים לטווח קצר.
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onPrev}>חזור</Button>
        <Button onClick={onNext}>המשך</Button>
      </div>
    </div>
  );
}

// ─── Number stepper (+/-) ───────────────────────────────────────────
function NumberStepper({ value, onChange, min, max, step = 1, unit = '', displayFn }) {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const timerRef = React.useRef(null);
  const rampRef = React.useRef({ intervalMs: 180, fastStep: 1 });

  const clamp = (v) => Math.max(min, Math.min(max, +v.toFixed(step < 1 ? 1 : 0)));

  const stopHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    rampRef.current = { intervalMs: 180, fastStep: 1 };
  };

  // On press-and-hold: start repeating, accelerating after first second
  const startHold = (direction) => {
    // First tick happens immediately via onClick
    let ticks = 0;
    const tick = () => {
      ticks++;
      // Accelerate: after 5 ticks bump step size, after 12 bump again
      const fastStep = ticks > 12 ? step * 10 : ticks > 5 ? step * 3 : step;
      onChange(clamp(value + direction * fastStep));
      // After accelerating, shorten interval
      if (ticks === 5 && rampRef.current.intervalMs > 80) {
        rampRef.current.intervalMs = 80;
        clearInterval(timerRef.current);
        timerRef.current = setInterval(tick, rampRef.current.intervalMs);
      }
      if (ticks === 12 && rampRef.current.intervalMs > 40) {
        rampRef.current.intervalMs = 40;
        clearInterval(timerRef.current);
        timerRef.current = setInterval(tick, rampRef.current.intervalMs);
      }
    };
    // Start after 350ms to not conflict with simple click
    timerRef.current = setTimeout(() => {
      timerRef.current = setInterval(tick, rampRef.current.intervalMs);
    }, 350);
  };

  // Need fresh `value` in the interval — use a ref
  const valueRef = React.useRef(value);
  React.useEffect(() => { valueRef.current = value; }, [value]);

  const startHoldRef = (direction) => {
    let ticks = 0;
    const tick = () => {
      ticks++;
      const fastStep = ticks > 12 ? step * 10 : ticks > 5 ? step * 3 : step;
      const next = Math.max(min, Math.min(max, +(valueRef.current + direction * fastStep).toFixed(step < 1 ? 1 : 0)));
      valueRef.current = next;
      onChange(next);
      if (ticks === 5 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(tick, 80);
      }
      if (ticks === 12 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(tick, 40);
      }
    };
    timerRef.current = setTimeout(() => {
      timerRef.current = setInterval(tick, 180);
    }, 350);
  };

  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

  const commitEdit = () => {
    const parsed = parseFloat(editValue.replace(',', '.'));
    if (!isNaN(parsed)) onChange(clamp(parsed));
    setEditing(false);
    setEditValue('');
  };

  const display = displayFn ? displayFn(value) : value.toFixed(step < 1 ? 1 : 0);

  React.useEffect(() => () => stopHold(), []);

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
      <button
        onClick={dec}
        onPointerDown={() => startHoldRef(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        style={btnPlusMinus}
      >−</button>
      {editing ? (
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); setEditValue(''); } }}
          style={{
            flex: 1, background: T.bgElev, border: `1px solid ${T.lime}`, borderRadius: 12,
            textAlign: 'center', fontFamily: T.mono, fontSize: 26, fontWeight: 700,
            color: T.ink, outline: 'none', padding: 0, letterSpacing: -1,
          }}
        />
      ) : (
        <div
          onClick={() => { setEditValue(String(display)); setEditing(true); }}
          style={{
            flex: 1, background: T.bgElev, border: `1px solid ${T.stroke}`, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'text', userSelect: 'none',
          }}>
          <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, letterSpacing: -1, color: T.ink }}>{display}</span>
          <span style={{ fontSize: 12, color: T.inkMute }}>{unit}</span>
        </div>
      )}
      <button
        onClick={inc}
        onPointerDown={() => startHoldRef(+1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        style={btnPlusMinus}
      >+</button>
    </div>
  );
}
// QA17: minHeight=44 guarantees Apple/Google touch-target sizing even when
// the central input is short. width=56 stays the same so −/+ are symmetric.
// QA9: identical style for both buttons (same width, same minHeight, same
// font/border) — symmetry is structural, not just visual.
const btnPlusMinus = {
  width: 56, minHeight: 44,
  background: T.bgElev, border: `1px solid ${T.stroke}`,
  borderRadius: 12, color: T.ink, fontSize: 24, fontFamily: T.mono, fontWeight: 700,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};

// ─── Step 5 (index 4): AI setup — access code or personal key ───────
function AiSetupStep({ mode, setMode, sharedPw, setSharedPw, apiKey, setApiKey, onComplete, onPrev }) {
  const [showSecret, setShowSecret] = React.useState(false);

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>אחרון · מערכת חכמה</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>תובנות חכמות</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginTop: 8, lineHeight: 1.6 }}>
        הוסף ארוחות מתיאור או תמונה, קבל ניתוחי שבוע אישיים.
        תוכל להגדיר גם מאוחר יותר מהפרופיל.
      </div>

      {/* Mode selection */}
      <div style={{ marginTop: 24, display: 'flex', background: T.bgElev2, borderRadius: 10, padding: 3 }}>
        {[
          ['shared', 'קוד גישה'],
          ['direct', 'API אישי'],
          ['skip', 'דלג'],
        ].map(([v, label]) => (
          <button key={v} onClick={() => setMode(v)} style={{
            flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer',
            background: mode === v ? T.lime : 'transparent',
            color: mode === v ? T.bg : T.inkSub, borderRadius: 8,
            fontFamily: T.font, fontSize: 12, fontWeight: 700,
          }}>{label}</button>
        ))}
      </div>

      {/* Shared password mode */}
      {mode === 'shared' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 12, lineHeight: 1.6 }}>
            הזן את קוד הגישה שקיבלת. נרשם פעם אחת ונשמר על המכשיר.
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קוד גישה</div>
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={sharedPw}
              onChange={e => setSharedPw(e.target.value)}
              placeholder="הזן את הקוד"
              inputMode="numeric"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', paddingLeft: 40,
                background: T.bgElev, border: `1px solid ${T.stroke}`, borderRadius: 12,
                color: T.ink, fontSize: 15, fontFamily: T.mono, outline: 'none',
                direction: 'ltr', textAlign: 'left',
              }}
            />
            <button onClick={() => setShowSecret(s => !s)} style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer',
              padding: 6, fontSize: 14,
            }}>{showSecret ? '🙈' : '👁'}</button>
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginTop: 10, lineHeight: 1.5 }}>
            אין לך קוד? פנה למי ששיתף איתך את האפליקציה.
          </div>
        </div>
      )}

      {/* Personal API key mode */}
      {mode === 'direct' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 12, lineHeight: 1.6 }}>
            יש לך חשבון Anthropic? הדבק כאן API key משלך.
            אתה משלם ישירות לאנתרופיק לפי שימוש.
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>API key</div>
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{
                width: '100%', padding: '14px 16px', paddingLeft: 40,
                background: T.bgElev, border: `1px solid ${T.stroke}`, borderRadius: 12,
                color: T.ink, fontSize: 13, fontFamily: T.mono, outline: 'none',
                direction: 'ltr', textAlign: 'left',
              }}
            />
            <button onClick={() => setShowSecret(s => !s)} style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer',
              padding: 6, fontSize: 14,
            }}>{showSecret ? '🙈' : '👁'}</button>
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginTop: 10, lineHeight: 1.5 }}>
            קבל מפתח ב-<span style={{ color: T.lime, fontFamily: T.mono }}>console.anthropic.com</span>.
          </div>
        </div>
      )}

      {/* Skip mode */}
      {mode === 'skip' && (
        <div style={{ marginTop: 20, padding: 16, background: T.bgElev, borderRadius: T.radius, border: `1px solid ${T.stroke}` }}>
          <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.7 }}>
            אין בעיה. ללא המערכת החכמה עדיין יש לך:
            <br />• מעקב משקל יומי מלא
            <br />• הזנת ארוחות ידנית
            <br />• גרפים וסטטיסטיקות
            <br /><br />
            בכל רגע תוכל להפעיל מהפרופיל → <span style={{ color: T.lime }}>תובנות חכמות</span>.
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onPrev}>חזור</Button>
        <Button onClick={onComplete}>סיים והתחל</Button>
      </div>
    </div>
  );
}
