// ════════════════════════════════════════════════════════════════════
// 23-screen-report.jsx — AI-powered personal report (PDF + WhatsApp)
// ════════════════════════════════════════════════════════════════════
//
// Flow:
//   1. ReportRecipientStep   — who is the report for?
//   2. ReportPeriodStep      — week / month / 3mo / all / custom
//   3. ReportIncludesStep    — multi-select what to include (+ smart hints)
//   4. ReportLoadingStep     — call generateReportInsights() with snapshot
//   5. ReportDisplay         — themed, branded report (the artifact)
//   6. Share bar             — PDF download/share + WhatsApp text share
//
// Insights min-bar: PR_MIN_OCCURRENCES idea — we require >= 7 days of weight
// entries to even attempt AI insights. Anything less and we render the
// "אסוף עוד מעט נתונים" screen instead.

const REPORT_MIN_DAYS = 7;

// ─── Recipient catalog (single source of truth for labels/icons) ────
const REPORT_RECIPIENTS = [
  { id: 'self',    icon: '🧑',   label: 'לעצמי',           tone: 'personal' },
  { id: 'doctor',  icon: '👨‍⚕️', label: 'רופא/דיאטנית',    tone: 'clinical' },
  { id: 'trainer', icon: '🏋️',   label: 'מאמן כושר',       tone: 'performance' },
  { id: 'friend',  icon: '👫',   label: 'חבר/משפחה',       tone: 'warm' },
  { id: 'other',   icon: '✏️',   label: 'אחר',             tone: 'neutral' },
];

const REPORT_PERIODS = [
  { id: 'week',    label: 'שבוע אחרון',  days: 7 },
  { id: 'month',   label: 'חודש אחרון',  days: 30 },
  { id: 'quarter', label: '3 חודשים',    days: 90 },
  { id: 'all',     label: 'מההתחלה',     days: null }, // computed at runtime
  { id: 'custom',  label: 'מותאם',       days: null },
];

function getRecipient(id) {
  return REPORT_RECIPIENTS.find(r => r.id === id) || REPORT_RECIPIENTS[0];
}

// ════════════════════════════════════════════════════════════════════
// ReportScreen — orchestrator (overlay over Profile)
// ════════════════════════════════════════════════════════════════════
function ReportScreen({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  // Persisted prefs as defaults (filled in by store on first run)
  const prefs = state.settings.reportPrefs || {};

  const [step, setStep] = React.useState('recipient'); // recipient|period|includes|loading|display|insufficient
  const [recipient, setRecipient] = React.useState(prefs.recipient || 'self');
  const [customRecipient, setCustomRecipient] = React.useState(prefs.customRecipient || '');
  const [period, setPeriod] = React.useState(prefs.period || 'month');
  const [customFromDate, setCustomFromDate] = React.useState(prefs.customFromDate || addDaysISO(todayISO(), -30));
  const [customToDate, setCustomToDate] = React.useState(prefs.customToDate || todayISO());
  const [includes, setIncludes] = React.useState(() => {
    // First-time defaults: notes auto-on if recipient === 'self'
    const base = prefs.includes || { weight: true, nutrition: true, workouts: true, ai_insights: true, notes: false };
    return { ...base, notes: (prefs.recipient || 'self') === 'self' ? true : base.notes };
  });
  const [aiResult, setAiResult] = React.useState(null);
  const [aiError, setAiError] = React.useState(null);

  // Compute the date window for the chosen period
  const dateWindow = React.useMemo(() => {
    const today = todayISO();
    if (period === 'custom') {
      return { from: customFromDate, to: customToDate };
    }
    if (period === 'all') {
      const dates = Object.keys(state.entries || {}).sort();
      return { from: dates[0] || today, to: today };
    }
    const cfg = REPORT_PERIODS.find(p => p.id === period);
    return { from: addDaysISO(today, -((cfg?.days || 30) - 1)), to: today };
  }, [period, customFromDate, customToDate, state.entries]);

  // Build the data snapshot for the chosen window + includes
  const snapshot = React.useMemo(
    () => buildReportSnapshot(state, dateWindow.from, dateWindow.to, includes),
    [state, dateWindow, includes]
  );

  const daysWithData = snapshot.weight_entries.length;
  const enoughData = daysWithData >= REPORT_MIN_DAYS;

  // Persist prefs whenever they change — so next time we land with the same answers
  React.useEffect(() => {
    dispatch({ type: 'SET_SETTING', key: 'reportPrefs', value: {
      recipient, customRecipient, period, customFromDate, customToDate, includes,
    }});
  }, [recipient, customRecipient, period, customFromDate, customToDate, includes]);

  // Switch recipient: auto-flip notes default for 'self' vs others
  const pickRecipient = (id) => {
    setRecipient(id);
    setIncludes(inc => ({ ...inc, notes: id === 'self' ? true : false }));
  };

  // Trigger AI generation
  const generate = async () => {
    if (!includes.ai_insights) {
      // Skip AI entirely — go straight to display
      setStep('display');
      return;
    }
    if (!apiReady(state.apiConfig)) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    if (!enoughData) {
      setStep('insufficient');
      return;
    }
    setStep('loading');
    setAiError(null);
    try {
      const result = await generateReportInsights(snapshot, recipient, customRecipient, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({ type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          feature: 'report_insights', costUSD: cost,
        });
      }, state);
      if (result?.insufficient_data) {
        setStep('insufficient');
        return;
      }
      setAiResult(result);
      setStep('display');
    } catch (e) {
      setAiError(personaErrorFromException(state, e));
      setStep('includes'); // bounce back so user can retry
      toast(personaErrorFromException(state, e), { type: 'error' });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 850,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <ReportHeader step={step} onClose={onClose}
        onBack={
          step === 'period'   ? () => setStep('recipient') :
          step === 'includes' ? () => setStep('period')    :
          step === 'display'  ? () => setStep('includes')  :
          null
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 'recipient' && (
          <ReportRecipientStep
            value={recipient} customValue={customRecipient}
            onChange={pickRecipient} onCustomChange={setCustomRecipient}
            onNext={() => setStep('period')}
          />
        )}
        {step === 'period' && (
          <ReportPeriodStep
            value={period} from={customFromDate} to={customToDate}
            onChange={setPeriod} onFromChange={setCustomFromDate} onToChange={setCustomToDate}
            onNext={() => setStep('includes')}
          />
        )}
        {step === 'includes' && (
          <ReportIncludesStep
            includes={includes} setIncludes={setIncludes}
            recipient={recipient} customRecipient={customRecipient}
            daysWithData={daysWithData} hasApi={apiReady(state.apiConfig)}
            error={aiError}
            onGenerate={generate}
          />
        )}
        {step === 'loading' && <ReportLoadingStep />}
        {step === 'insufficient' && (
          <ReportInsufficientStep daysWithData={daysWithData} onClose={onClose} />
        )}
        {step === 'display' && (
          <ReportDisplay
            snapshot={snapshot}
            ai={aiResult}
            recipient={recipient} customRecipient={customRecipient}
            includes={includes} period={period} dateWindow={dateWindow}
          />
        )}
      </div>
    </div>
  );
}

// ─── Header (shared across all steps) ───────────────────────────────
// v3.10: emoji titles → SVG icons via TabIcon. Tags translated to Hebrew.
function ReportHeader({ step, onClose, onBack }) {
  const titles = {
    recipient:    { tag: 'שלב 1/3',  title: 'למי הדוח?',           iconName: 'share' },
    period:       { tag: 'שלב 2/3',  title: 'איזה תקופה?',         iconName: 'calendar' },
    includes:     { tag: 'שלב 3/3',  title: 'מה לכלול?',           iconName: 'check-circle' },
    loading:      { tag: 'מייצר',    title: 'בונה את הדוח...',     iconName: null },
    insufficient: { tag: 'צריך עוד נתונים', title: 'אסוף עוד מעט נתונים', iconName: 'info' },
    display:      { tag: 'דוח',      title: 'הדוח מוכן',           iconName: 'check-circle' },
  };
  const t = titles[step] || titles.recipient;
  return (
    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
      <button onClick={onClose} aria-label="סגור" style={{
        width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
        border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{t.tag}</div>
        <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t.iconName && (
            <span style={{ color: T.lime, display: 'inline-flex', flexShrink: 0 }}>
              <TabIcon name={t.iconName} size={16} />
            </span>
          )}
          {t.title}
        </div>
      </div>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'transparent', border: `1px solid ${T.stroke}`, color: T.inkSub,
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: T.font, cursor: 'pointer',
        }}>‹ חזור</button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 1 — recipient
// ════════════════════════════════════════════════════════════════════
function ReportRecipientStep({ value, customValue, onChange, onCustomChange, onNext }) {
  return (
    <div style={{ padding: '18px 18px 24px' }}>
      <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 16 }}>
        הבחירה הזו תקבע את הטון של התובנות. רופא יקבל ניסוח אחר מחבר.
      </div>

      <Col gap={10}>
        {REPORT_RECIPIENTS.map(r => (
          <button key={r.id} onClick={() => onChange(r.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 14,
            border: `1.5px solid ${value === r.id ? T.lime : T.stroke}`,
            background: value === r.id ? `${T.lime}12` : T.bgElev,
            borderRadius: T.radius, cursor: 'pointer',
            textAlign: 'right', direction: 'rtl', fontFamily: T.font, color: T.ink,
            width: '100%',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: value === r.id ? `${T.lime}22` : T.bgElev2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>{r.icon}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{r.label}</div>
            {value === r.id && (
              <div style={{
                width: 20, height: 20, borderRadius: 10, background: T.lime,
                color: T.bg, fontSize: 12, fontWeight: 800, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✓</div>
            )}
          </button>
        ))}
      </Col>

      {value === 'other' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>למי?</div>
          <input
            value={customValue}
            onChange={e => onCustomChange(e.target.value)}
            placeholder="למשל: ביטוח, מעסיק, מחקר..."
            style={{
              width: '100%', padding: '12px 14px', background: T.bgElev,
              border: `1px solid ${T.stroke}`, borderRadius: 10,
              color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
              direction: 'rtl', textAlign: 'right', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Button onClick={onNext} disabled={value === 'other' && !customValue.trim()}>המשך</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 2 — period
// ════════════════════════════════════════════════════════════════════
function ReportPeriodStep({ value, from, to, onChange, onFromChange, onToChange, onNext }) {
  return (
    <div style={{ padding: '18px 18px 24px' }}>
      <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 16 }}>
        כמה אחורה לסקור? תקופה ארוכה = יותר נתונים אבל פחות חד.
      </div>

      <Col gap={8}>
        {REPORT_PERIODS.map(p => (
          <button key={p.id} onClick={() => onChange(p.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14,
            border: `1.5px solid ${value === p.id ? T.lime : T.stroke}`,
            background: value === p.id ? `${T.lime}12` : T.bgElev,
            borderRadius: T.radius, cursor: 'pointer',
            textAlign: 'right', direction: 'rtl', fontFamily: T.font, color: T.ink,
            width: '100%',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              border: `2px solid ${value === p.id ? T.lime : T.stroke}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {value === p.id && <div style={{ width: 9, height: 9, borderRadius: 5, background: T.lime }} />}
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{p.label}</div>
            {p.days && <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>{p.days} ימים</div>}
          </button>
        ))}
      </Col>

      {value === 'custom' && (
        <div style={{ marginTop: 14, padding: 12, background: T.bgElev, borderRadius: 10, border: `1px solid ${T.stroke}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 4, fontFamily: T.mono, letterSpacing: 1 }}>מ-</div>
              <input type="date" value={from} onChange={e => onFromChange(e.target.value)} max={to} style={dateInputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 4, fontFamily: T.mono, letterSpacing: 1 }}>עד-</div>
              <input type="date" value={to} onChange={e => onToChange(e.target.value)} max={todayISO()} min={from} style={dateInputStyle} />
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Button onClick={onNext}>המשך</Button>
      </div>
    </div>
  );
}

const dateInputStyle = {
  width: '100%', padding: '10px 12px', background: T.bg,
  border: `1px solid ${T.stroke}`, borderRadius: 8, color: T.ink,
  fontSize: 13, fontFamily: T.mono, outline: 'none', boxSizing: 'border-box',
  direction: 'ltr', textAlign: 'left',
};

// ════════════════════════════════════════════════════════════════════
// Step 3 — includes (multi-select with smart hints + warnings)
// ════════════════════════════════════════════════════════════════════
function ReportIncludesStep({ includes, setIncludes, recipient, customRecipient, daysWithData, hasApi, error, onGenerate }) {
  const toggle = (key) => setIncludes(inc => ({ ...inc, [key]: !inc[key] }));

  const items = [
    { key: 'weight',      label: 'משקל',          desc: 'גרף + ממוצעים' },
    { key: 'nutrition',   label: 'תזונה',         desc: 'ממוצעים + 5 ארוחות נפוצות' },
    { key: 'workouts',    label: 'אימונים',       desc: 'תדירות + שיאים' },
    { key: 'ai_insights', label: 'תובנות חכמות', desc: 'תגלית + הסבר + המלצה' },
  ];

  const personalNote = recipient === 'self';

  // D5 — smart recommendations
  const hints = [];
  if (recipient === 'doctor' && !includes.workouts) {
    hints.push({ kind: 'add', text: 'רופאים אוהבים גם נתוני אימון. להוסיף?', action: () => setIncludes(i => ({ ...i, workouts: true })), label: 'הוסף אימונים' });
  }
  if (recipient === 'friend' && includes.weight && includes.nutrition && includes.workouts && includes.ai_insights) {
    hints.push({ kind: 'reduce', text: 'לחבר מספיק משקל + תובנה. פחות מציף יותר אישי. להפחית?',
      action: () => setIncludes(i => ({ ...i, nutrition: false, workouts: false })), label: 'השאר משקל + תובנה' });
  }

  return (
    <div style={{ padding: '18px 18px 24px' }}>
      <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 14 }}>
        סמן מה לכלול בדוח. ככל שיותר — הדוח יותר ארוך.
      </div>

      <Col gap={8}>
        {items.map(it => (
          <button key={it.key} onClick={() => toggle(it.key)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            border: `1.5px solid ${includes[it.key] ? T.lime : T.stroke}`,
            background: includes[it.key] ? `${T.lime}12` : T.bgElev,
            borderRadius: 10, cursor: 'pointer',
            textAlign: 'right', direction: 'rtl', fontFamily: T.font, color: T.ink,
            width: '100%',
          }}>
            <Checkmark on={!!includes[it.key]} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{it.label}</div>
              <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>{it.desc}</div>
            </div>
          </button>
        ))}

        {/* Notes — special: warning if not "self" */}
        <button onClick={() => toggle('notes')} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
          border: `1.5px solid ${includes.notes ? T.lime : T.stroke}`,
          background: includes.notes ? `${T.lime}12` : T.bgElev,
          borderRadius: 10, cursor: 'pointer',
          textAlign: 'right', direction: 'rtl', fontFamily: T.font, color: T.ink,
          width: '100%',
        }}>
          <Checkmark on={!!includes.notes} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>הערות אישיות</div>
            <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>
              הערות שכתבת לכל שקילה
            </div>
            {includes.notes && !personalNote && (
              <div style={{
                marginTop: 8, padding: '6px 10px',
                background: `${T.amber}20`, border: `1px solid ${T.amber}55`,
                borderRadius: 6, fontSize: 11, color: T.amber, lineHeight: 1.5,
              }}>
                ⚠️ ההערות אישיות שלך — בדוק שאתה לא חולק משהו פרטי בטעות
              </div>
            )}
          </div>
        </button>
      </Col>

      {/* Smart hints */}
      {hints.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {hints.map((h, i) => (
            <div key={i} style={{
              padding: 12, marginBottom: 8,
              background: `${T.cyan}12`, border: `1px solid ${T.cyan}44`,
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 12, color: T.cyan, lineHeight: 1.5, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ flexShrink: 0, paddingTop: 2 }}><TabIcon name="lightbulb" size={14} /></span>
                <span>{h.text}</span>
              </div>
              <button onClick={h.action} style={{
                background: T.cyan, color: T.bg, border: 'none',
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                fontFamily: T.font, cursor: 'pointer',
              }}>{h.label}</button>
            </div>
          ))}
        </div>
      )}

      {/* Data + API status */}
      <div style={{
        marginTop: 14, padding: 12,
        background: T.bgElev2, borderRadius: 10,
        fontSize: 11, color: T.inkMute, fontFamily: T.mono, lineHeight: 1.6,
      }}>
        {daysWithData} ימי שקילה בתקופה
        {includes.ai_insights && (
          daysWithData < REPORT_MIN_DAYS
            ? ` · נדרשים ${REPORT_MIN_DAYS} לפחות לתובנות חכמות`
            : hasApi ? ' · המערכת פעילה' : ' · ⚠️ המערכת לא הוגדרה בפרופיל'
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: `${T.rose}15`, border: `1px solid ${T.rose}44`,
          borderRadius: 10, fontSize: 12, color: T.rose,
        }}>{error}</div>
      )}

      <div style={{ marginTop: 20 }}>
        <Button onClick={onGenerate}>צור דוח</Button>
      </div>
    </div>
  );
}

function Checkmark({ on }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      border: `2px solid ${on ? T.lime : T.stroke}`,
      background: on ? T.lime : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: T.bg, fontSize: 13, fontWeight: 800,
    }}>{on ? '✓' : ''}</div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Loading + Insufficient screens
// ════════════════════════════════════════════════════════════════════
function ReportLoadingStep() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, animation: 'mk-fadein 600ms', color: T.lime, display: 'flex', justifyContent: 'center' }}>
        <TabIcon name="share" size={44} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
        בונה את הדוח האישי שלך...
      </div>
      <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
        המערכת מחפשת תבניות בנתונים שלך — תבניות שאתה לא ראית
      </div>
      <div style={{ marginTop: 24, maxWidth: 280, margin: '24px auto 0' }}>
        <SkeletonLines lines={5} />
      </div>
    </div>
  );
}

function ReportInsufficientStep({ daysWithData, onClose }) {
  const { state } = useStore();
  const need = REPORT_MIN_DAYS - daysWithData;
  // Persona-aware copy with {X}=daysWithData, {Y}=need substitution
  const insufficientLine = personaStr(
    state, 'report_insufficient_data',
    `יש לך ${daysWithData}/${REPORT_MIN_DAYS} ימי שקילה.`,
    { X: daysWithData, Y: need }
  );
  const keepLoggingLine = personaStr(
    state, 'report_keep_logging',
    `נדרשים עוד ${need} ${need === 1 ? 'יום' : 'ימים'}.`,
    { X: daysWithData, Y: need }
  );
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, color: T.inkMute, opacity: 0.7, display: 'flex', justifyContent: 'center' }}>
        <TabIcon name="chart-bar" size={44} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 12 }}>
        אסוף עוד מעט נתונים
      </div>
      <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>
        {insufficientLine}
        <br /><br />
        {keepLoggingLine}
      </div>
      <div style={{ marginTop: 24, maxWidth: 240, margin: '24px auto 0' }}>
        <Button onClick={onClose}>סגור</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Snapshot builder for the report — what we send to the AI + what we
// also use for the on-screen rendering. Same source of truth.
// ════════════════════════════════════════════════════════════════════
function buildReportSnapshot(state, fromISO, toISO, includes) {
  const today = todayISO();
  const start = fromISO || today;
  const end = toISO || today;

  // Weights in window
  const weightEntries = Object.entries(state.entries || {})
    .filter(([d]) => d >= start && d <= end)
    .map(([d, e]) => ({ date: d, weight_kg: e.weight, time: e.time, note: e.note || '' }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Nutrition aggregated per day in window + top meals
  const nutritionByDay = {};
  const mealCounts = {};        // description -> { count, calories, protein, carbs, fat }
  Object.entries(state.nutrition?.meals || {}).forEach(([d, list]) => {
    if (d < start || d > end) return;
    const sums = sumMealsForDay(list);
    if (sums.count > 0) {
      nutritionByDay[d] = {
        calories: sums.calories, protein_g: sums.protein, carbs_g: sums.carbs,
        fat_g: sums.fat, meals_logged: sums.count,
      };
    }
    list.forEach(m => {
      const key = (m.description || '').trim().toLowerCase() || 'ארוחה';
      const prev = mealCounts[key] || { name: m.description || 'ארוחה', count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
      prev.count += 1;
      prev.calories += m.calories || 0;
      prev.protein += m.protein || 0;
      prev.carbs += m.carbs || 0;
      prev.fat += m.fat || 0;
      mealCounts[key] = prev;
    });
  });
  const topMeals = Object.values(mealCounts)
    .sort((a, b) => b.count - a.count).slice(0, 5)
    .map(m => ({
      name: m.name, count: m.count,
      avg_calories: Math.round(m.calories / m.count),
      avg_protein: Math.round(m.protein / m.count),
    }));

  // Daily nutrition averages
  const days = Object.values(nutritionByDay);
  const avgDay = days.length > 0 ? {
    calories: Math.round(days.reduce((s, x) => s + x.calories, 0) / days.length),
    protein_g: Math.round(days.reduce((s, x) => s + x.protein_g, 0) / days.length),
    carbs_g: Math.round(days.reduce((s, x) => s + x.carbs_g, 0) / days.length),
    fat_g: Math.round(days.reduce((s, x) => s + x.fat_g, 0) / days.length),
  } : null;

  // Workouts in window — aggregate counts + PRs
  const workoutsInWindow = [];
  Object.entries(state.workouts?.sessions || {}).forEach(([d, list]) => {
    if (d < start || d > end) return;
    list.forEach(w => workoutsInWindow.push({ ...w, _date: d }));
  });
  const workoutTypeCounts = {};
  workoutsInWindow.forEach(w => {
    const t = w.type || 'other';
    workoutTypeCounts[t] = (workoutTypeCounts[t] || 0) + 1;
  });

  // PRs achieved IN-window: scan all sessions, but only PRs where the broken-record
  // workout itself is in [start,end].
  const prsInWindow = [];
  workoutsInWindow.forEach(w => {
    const broken = findNewPRs(state.workouts?.sessions || {}, w._date, w);
    broken.forEach(b => {
      b.kinds.forEach(k => {
        prsInWindow.push({
          exercise: b.exerciseName, date: w._date, kind: k.kind,
          value: k.value, prev: k.prevValue,
        });
      });
    });
  });

  // Stats summary
  const wList = weightEntries.map(e => e.weight_kg);
  const weightSummary = wList.length > 0 ? {
    start_kg: wList[0],
    end_kg: wList[wList.length - 1],
    delta_kg: Math.round((wList[wList.length - 1] - wList[0]) * 10) / 10,
    min_kg: Math.min(...wList),
    max_kg: Math.max(...wList),
    days_logged: wList.length,
  } : null;

  return {
    user: {
      name: state.user.name, gender: state.user.gender,
      height_cm: state.user.heightCm, age: state.user.ageYears,
      start_weight_kg: state.user.startWeight, start_date: state.user.startDate,
    },
    goal: {
      target_weight_kg: state.goal.weight, pace: state.goal.pace,
      pace_kg_per_week: PACE_CONFIG[state.goal.pace]?.kgPerWeek,
    },
    period: { from: start, to: end, days: daysBetweenISO(start, end) + 1 },
    includes,
    weight_entries: weightEntries,
    weight_summary: weightSummary,
    nutrition_by_day: nutritionByDay,
    nutrition_avg_per_day: avgDay,
    nutrition_top_meals: topMeals,
    nutrition_days_logged: Object.keys(nutritionByDay).length,
    workouts_count: workoutsInWindow.length,
    workouts_by_type: workoutTypeCounts,
    workouts_prs: prsInWindow,
  };
}

// ════════════════════════════════════════════════════════════════════
// Step 5 — ReportDisplay (the actual report + share bar)
// ════════════════════════════════════════════════════════════════════
function ReportDisplay({ snapshot, ai, recipient, customRecipient, includes, period, dateWindow }) {
  const reportRef = React.useRef(null);
  const toast = useToast();
  const [exporting, setExporting] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  const recCfg = getRecipient(recipient);
  const recLabel = recipient === 'other' ? (customRecipient.trim() || 'אחר') : recCfg.label;
  // Personal headline only for self / friend (per spec)
  const showHeadline = (recipient === 'self' || recipient === 'friend') && !!ai?.headline;
  const periodLabel = (REPORT_PERIODS.find(p => p.id === period) || {}).label || 'תקופה מותאמת';

  // PDF export — lazy load libs
  const handlePDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await loadPdfLibs();
      const canvas = await window.html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0b0d0c',
        useCORS: true,
        logging: false,
      });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = canvas.height * pdfW / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let position = 0;
      let heightLeft = imgH;
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pdfH;
      }

      const filename = `mishkalut-report-${todayISO()}.pdf`;

      // Try Web Share API with the file; fall back to download
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'דוח אישי · מִשְׁקַלּוּת' });
        } catch (_) {
          pdf.save(filename); // user dismissed — give them the download anyway
        }
      } else {
        pdf.save(filename);
      }
    } catch (e) {
      console.warn('PDF export failed:', e);
      toast('יצוא PDF נכשל. נסה שוב.', { type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // WhatsApp / text share
  const handleTextShare = async () => {
    const text = (ai?.whatsapp_summary || '').trim() || buildFallbackSummary(snapshot);
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast('הסיכום הועתק — אפשר להדביק לוואטסאפ', { type: 'success' });
      } else {
        toast('שיתוף לא זמין בדפדפן הזה', { type: 'error' });
      }
    } catch (e) {
      // User dismissed — silent
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ padding: '14px 0 100px' }}>
      {/* Share bar — sticky at top of scroll */}
      <div style={{ padding: '0 18px 14px', display: 'flex', gap: 10 }}>
        <button onClick={handlePDF} disabled={exporting} style={{ ...shareBtnPrimary(exporting), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {exporting ? 'מכין...' : <><TabIcon name="download-inv" size={16} /> PDF להורדה</>}
        </button>
        <button onClick={handleTextShare} disabled={sharing} style={{ ...shareBtnSecondary(sharing), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {sharing ? '...' : <><TabIcon name="chat" size={16} /> שלח כטקסט</>}
        </button>
      </div>

      {/* The report itself — capture target for html2canvas */}
      <div ref={reportRef} style={{
        background: T.bg, color: T.ink, fontFamily: T.font, direction: 'rtl',
        padding: '28px 22px', maxWidth: 760, margin: '0 auto',
      }}>
        {/* Cover page */}
        <ReportCoverPage
          snapshot={snapshot} recipientLabel={recLabel}
          periodLabel={periodLabel} headline={showHeadline ? ai.headline : null}
          dateWindow={dateWindow}
        />

        {/* AI insights page */}
        {includes.ai_insights && ai && !ai.insufficient_data && (
          <ReportInsightsPage ai={ai} />
        )}

        {/* Weight page */}
        {includes.weight && snapshot.weight_summary && (
          <ReportWeightPage snapshot={snapshot} includeNotes={includes.notes} />
        )}

        {/* Nutrition page */}
        {includes.nutrition && snapshot.nutrition_avg_per_day && (
          <ReportNutritionPage snapshot={snapshot} />
        )}

        {/* Workout page */}
        {includes.workouts && snapshot.workouts_count > 0 && (
          <ReportWorkoutPage snapshot={snapshot} />
        )}

        {/* Closing page — the action item */}
        <ReportClosingPage ai={ai} recipientLabel={recLabel} />
      </div>
    </div>
  );
}

// ─── Page primitives — flat colors (no gradients/shadows) for clean PDF ──
const ReportPageStyle = {
  marginBottom: 28, padding: 18,
  background: '#141816', border: `1px solid ${T.stroke}`,
  borderRadius: 8,
};
const ReportPageTagStyle = {
  fontSize: 10, color: T.lime, fontFamily: T.mono, letterSpacing: 2, marginBottom: 8,
};
const ReportPageTitleStyle = {
  fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 12, lineHeight: 1.3,
};

function ReportCoverPage({ snapshot, recipientLabel, periodLabel, headline, dateWindow }) {
  const name = snapshot.user.name || 'משתמש';
  return (
    <div style={{
      marginBottom: 28, padding: '40px 22px',
      background: '#0b0d0c', border: `2px solid ${T.lime}`,
      borderRadius: 8, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 3, marginBottom: 8 }}>
        מִשְׁקַלּוּת · דוח אישי
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, marginBottom: 6, lineHeight: 1.3 }}>
        מסע אישי · {name}
      </div>
      <div style={{ fontSize: 12, color: T.inkMute, fontFamily: T.mono, marginBottom: 18 }}>
        {fmt.day(dateWindow.from)} — {fmt.day(dateWindow.to)}
      </div>
      <div style={{
        display: 'inline-block', padding: '6px 14px',
        background: `${T.lime}18`, border: `1px solid ${T.lime}55`,
        borderRadius: 999, fontSize: 12, color: T.lime, fontWeight: 700,
      }}>עבור: {recipientLabel} · {periodLabel}</div>

      {headline && (
        <div style={{
          marginTop: 26, padding: 16,
          background: '#1c211e', borderRadius: 8,
          fontSize: 14, color: T.ink, lineHeight: 1.6, fontStyle: 'italic',
        }}>
          "{headline}"
        </div>
      )}
    </div>
  );
}

function ReportInsightsPage({ ai }) {
  const cards = [
    { tag: 'תגלית', title: 'משהו שלא ראית', body: ai.discovery, color: T.lime },
    { tag: 'הסבר', title: 'למה זה קרה', body: ai.explanation, color: T.cyan },
    { tag: 'המלצה', title: 'צעד אחד עכשיו', body: ai.action, color: T.amber },
  ].filter(c => c.body);
  if (cards.length === 0) return null;
  return (
    <div style={ReportPageStyle}>
      <div style={ReportPageTagStyle}>תובנות</div>
      <div style={ReportPageTitleStyle}>3 תובנות שספציפיות לך</div>
      <Col gap={12}>
        {cards.map((c, i) => (
          <div key={i} style={{
            padding: 14, background: '#0b0d0c', borderRadius: 6,
            borderRight: `3px solid ${c.color}`,
          }}>
            <div style={{ fontSize: 10, color: c.color, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>
              {c.tag}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.7 }}>
              {c.body}
            </div>
          </div>
        ))}
      </Col>
    </div>
  );
}

function ReportWeightPage({ snapshot, includeNotes }) {
  const ws = snapshot.weight_summary;
  const data = snapshot.weight_entries.map(e => ({ date: e.date, weight: e.weight_kg }));
  // Single-word tone label
  const tone = (() => {
    if (!ws || ws.days_logged < 3) return 'לא מספיק';
    const range = ws.max_kg - ws.min_kg;
    if (range >= 2) return 'תנודתי';
    if (range >= 0.8) return 'מתון';
    return 'מתמיד';
  })();
  const toneColor = tone === 'מתמיד' ? T.lime : tone === 'תנודתי' ? T.amber : T.inkSub;

  const notedEntries = includeNotes
    ? snapshot.weight_entries.filter(e => e.note && e.note.trim()).slice(0, 8)
    : [];

  return (
    <div style={ReportPageStyle}>
      <div style={ReportPageTagStyle}>משקל</div>
      <div style={ReportPageTitleStyle}>תנועה במשקל</div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <ReportKPI label="התחלה" value={ws.start_kg.toFixed(1)} unit="ק״ג" />
        <ReportKPI label="סיום" value={ws.end_kg.toFixed(1)} unit="ק״ג" />
        <ReportKPI label="שינוי" value={(ws.delta_kg > 0 ? '+' : '') + ws.delta_kg.toFixed(1)} unit="ק״ג"
          color={ws.delta_kg < 0 ? T.lime : ws.delta_kg > 0 ? T.rose : T.ink} />
      </div>

      {/* Chart */}
      <div style={{ background: '#0b0d0c', borderRadius: 6, padding: 12, marginBottom: 12 }}>
        <WeightChart data={data} goal={snapshot.goal.target_weight_kg} width={680} height={170} showMarkers={false} showDots={true} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: '#0b0d0c', borderRadius: 6,
      }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>
          {ws.days_logged} שקילות · טווח {(ws.max_kg - ws.min_kg).toFixed(1)} ק״ג
        </div>
        <div style={{
          padding: '4px 12px', background: `${toneColor}22`,
          border: `1px solid ${toneColor}55`, borderRadius: 999,
          fontSize: 12, color: toneColor, fontWeight: 700,
        }}>{tone}</div>
      </div>

      {notedEntries.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
            הערות אישיות
          </div>
          <Col gap={6}>
            {notedEntries.map((e, i) => (
              <div key={i} style={{ padding: '8px 10px', background: '#0b0d0c', borderRadius: 6, fontSize: 12 }}>
                <span style={{ color: T.inkMute, fontFamily: T.mono, marginLeft: 8 }}>{fmt.dayShort(e.date)}</span>
                <span style={{ color: T.ink }}>{e.note}</span>
              </div>
            ))}
          </Col>
        </div>
      )}
    </div>
  );
}

function ReportNutritionPage({ snapshot }) {
  const a = snapshot.nutrition_avg_per_day;
  return (
    <div style={ReportPageStyle}>
      <div style={ReportPageTagStyle}>תזונה</div>
      <div style={ReportPageTitleStyle}>ממוצע יומי</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <ReportKPI label="קלוריות" value={a.calories} unit="" />
        <ReportKPI label="חלבון" value={a.protein_g} unit="ג" color={T.lime} />
        <ReportKPI label="פחמ׳" value={a.carbs_g} unit="ג" color={T.amber} />
        <ReportKPI label="שומן" value={a.fat_g} unit="ג" color={T.rose} />
      </div>

      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
        ארוחות נפוצות
      </div>
      <Col gap={6}>
        {snapshot.nutrition_top_meals.map((m, i) => (
          <div key={i} style={{
            padding: '10px 12px', background: '#0b0d0c', borderRadius: 6,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </div>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginTop: 2 }}>
                {m.count} פעמים · ~{m.avg_calories} ק״ק · ~{m.avg_protein}ג חלבון
              </div>
            </div>
            <div style={{
              padding: '3px 10px', background: `${T.amber}22`, color: T.amber,
              borderRadius: 999, fontSize: 11, fontFamily: T.mono, fontWeight: 700, flexShrink: 0,
            }}>×{m.count}</div>
          </div>
        ))}
      </Col>

      <div style={{ marginTop: 12, fontSize: 10, color: T.inkMute, fontFamily: T.mono, textAlign: 'center' }}>
        {snapshot.nutrition_days_logged} ימי תזונה רשומים
      </div>
    </div>
  );
}

function ReportWorkoutPage({ snapshot }) {
  const types = Object.entries(snapshot.workouts_by_type)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => {
      const t = (typeof getWorkoutType === 'function' ? getWorkoutType(id) : { label: id, color: T.lime, icon: '💪' });
      return { id, label: t.label, color: t.color, icon: t.icon, count };
    });
  return (
    <div style={ReportPageStyle}>
      <div style={ReportPageTagStyle}>אימונים</div>
      <div style={ReportPageTitleStyle}>{snapshot.workouts_count} אימונים בתקופה</div>

      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
        לפי סוג
      </div>
      <Col gap={6} style={{ marginBottom: 16 }}>
        {types.map(t => (
          <div key={t.id} style={{
            padding: '8px 12px', background: '#0b0d0c', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: `${t.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>{t.icon}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: t.color }}>{t.count}</div>
          </div>
        ))}
      </Col>

      {snapshot.workouts_prs.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
            🏆 שיאים שנשברו בתקופה
          </div>
          <Col gap={6}>
            {snapshot.workouts_prs.slice(0, 6).map((pr, i) => {
              const kindLabel = pr.kind === 'weight' ? 'משקל' : pr.kind === 'reps' ? 'חזרות' : 'נפח';
              const unit = pr.kind === 'reps' ? '' : ' ק״ג';
              return (
                <div key={i} style={{
                  padding: '8px 12px', background: '#0b0d0c', borderRadius: 6,
                  borderRight: `3px solid ${T.amber}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{pr.exercise}</div>
                    <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>{kindLabel} · {fmt.dayShort(pr.date)}</div>
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 13, color: T.amber, fontWeight: 700 }}>
                    {pr.value}{unit}
                    <span style={{ color: T.inkMute, fontWeight: 400 }}> (היה {pr.prev}{unit})</span>
                  </div>
                </div>
              );
            })}
          </Col>
        </>
      )}
    </div>
  );
}

function ReportClosingPage({ ai, recipientLabel }) {
  const action = ai?.action;
  return (
    <div style={{
      marginBottom: 8, padding: 22,
      background: '#1c211e', border: `1px solid ${T.lime}55`,
      borderRadius: 8, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 2, marginBottom: 8 }}>
        מה הלאה
      </div>
      {action ? (
        <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.6, fontWeight: 600 }}>
          {action}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6 }}>
          תמשיך לתעד עקבי — דוחות מאוחרים יותר יחפשו תבניות עמוקות יותר.
        </div>
      )}
      <div style={{ marginTop: 18, fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
        מִשְׁקַלּוּת
      </div>
    </div>
  );
}

function ReportKPI({ label, value, unit, color = T.ink }) {
  return (
    <div style={{
      padding: '12px 8px', background: '#0b0d0c', borderRadius: 6,
      border: `1px solid ${T.stroke}`, textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3, marginTop: 4 }}>
        <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color, letterSpacing: -0.5 }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: T.inkMute }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─── Share button styles ────────────────────────────────────────────
function shareBtnPrimary(disabled) {
  return {
    flex: 1, padding: '14px 16px',
    background: disabled ? T.bgElev2 : T.lime,
    color: disabled ? T.inkMute : T.bg,
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 800, fontFamily: T.font,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
function shareBtnSecondary(disabled) {
  return {
    flex: 1, padding: '14px 16px',
    background: T.bgElev, color: T.cyan,
    border: `1px solid ${T.cyan}55`, borderRadius: 12,
    fontSize: 14, fontWeight: 800, fontFamily: T.font,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

// ─── PDF lib lazy loader (CDN) ──────────────────────────────────────
function loadScriptOnce(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.dataset.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(s);
  });
}
async function loadPdfLibs() {
  // html2canvas + jsPDF UMD bundles, both ~150KB
  if (!window.html2canvas) {
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  }
  if (!window.jspdf) {
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
}

// ─── Fallback summary (when AI didn't run) ─────────────────────────
function buildFallbackSummary(snapshot) {
  const ws = snapshot.weight_summary;
  const name = snapshot.user.name || 'משתמש';
  const lines = [];
  lines.push('🌟 *מסע אישי · מִשְׁקַלּוּת*');
  lines.push('─────────────');
  lines.push(`💪 ${name}`);
  if (ws) {
    const arrow = ws.delta_kg < 0 ? '📉' : ws.delta_kg > 0 ? '📈' : '➡️';
    lines.push(`${arrow} שינוי: ${ws.delta_kg > 0 ? '+' : ''}${ws.delta_kg.toFixed(1)} ק״ג`);
  }
  if (snapshot.workouts_count > 0) {
    lines.push(`🏋️ אימונים: ${snapshot.workouts_count}`);
  }
  lines.push('');
  lines.push('📱 מחושב ב-מִשְׁקַלּוּת');
  return lines.join('\n');
}
