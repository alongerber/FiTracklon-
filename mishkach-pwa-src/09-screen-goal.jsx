// ════════════════════════════════════════════════════════════════════
// 09-screen-goal.jsx — Goal setup / edit
// ════════════════════════════════════════════════════════════════════

function GoalScreen({ onClose }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const unit = state.settings.unit;
  const current = stats.current;  // in kg

  // Convert between kg (storage) and display unit
  const toDisp = (kg) => unit === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : kg;
  const toKg = (disp) => unit === 'lb' ? disp / 2.20462 : disp;

  const defaultKg = state.goal.weight !== null
    ? state.goal.weight
    : (current !== null && current !== undefined ? Math.max(40, current - 5) : 70);

  const [goalDisplay, setGoalDisplay] = React.useState(toDisp(defaultKg));
  const [pace, setPace] = React.useState(state.goal.pace || 'balanced');

  const goalKg = toKg(goalDisplay);
  const diffKg = current !== null && current !== undefined ? current - goalKg : 0;
  const diffDisplay = Math.abs(toDisp(Math.abs(diffKg)));
  const weeks = weeksToGoal(current, goalKg, pace);

  const save = () => {
    dispatch({
      type: 'SET_GOAL',
      goal: { weight: Math.round(goalKg * 10) / 10, pace },
    });
    toast('היעד נשמר', { type: 'success' });
    onClose?.();
  };

  const minG = toDisp(Math.max(30, (current || 70) - 40));
  const maxG = toDisp(Math.min(300, (current || 70) + 40));

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 20,
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          {state.goal.weight !== null ? 'עדכון יעד' : 'הגדרת יעד'}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 20px' }}>
        {current !== null && current !== undefined && (
          <Card padding={16} style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>נוכחי</div>
                <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700, color: T.ink, marginTop: 4 }}>{fmt.kg(current, unit)}</div>
              </div>
              <div style={{ fontSize: 22, color: T.inkMute }}>→</div>
              <div>
                <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>יעד</div>
                <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700, color: T.lime, marginTop: 4 }}>{goalDisplay.toFixed(1)}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: T.inkSub }}>
              פער של <span style={{ color: T.ink, fontFamily: T.mono, fontWeight: 700 }}>{diffDisplay.toFixed(1)} {fmt.unitLabel(unit)}</span>
            </div>
          </Card>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 8, fontFamily: T.mono, letterSpacing: 1 }}>משקל יעד · {fmt.unitLabel(unit)}</div>
          <NumberStepper
            value={goalDisplay}
            onChange={setGoalDisplay}
            min={minG} max={maxG}
            step={unit === 'lb' ? 1 : 0.5}
            unit={fmt.unitLabel(unit)}
          />
        </div>

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 8, fontFamily: T.mono, letterSpacing: 1 }}>קצב</div>
        <Col gap={8} style={{ marginBottom: 24 }}>
          {Object.entries(PACE_CONFIG).map(([key, cfg]) => {
            const w = weeksToGoal(current, goalKg, key);
            const sel = pace === key;
            return (
              <button key={key} onClick={() => setPace(key)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                border: `1px solid ${sel ? cfg.color : T.stroke}`,
                background: sel ? `${cfg.color}10` : T.bgElev,
                borderRadius: T.radius, cursor: 'pointer', textAlign: 'right',
                direction: 'rtl', fontFamily: T.font, color: T.ink,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10,
                  border: `2px solid ${sel ? cfg.color : T.stroke}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel && <div style={{ width: 9, height: 9, borderRadius: 5, background: cfg.color }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 2 }}>{cfg.kgPerWeek} ק״ג/שבוע</div>
                </div>
                {w !== null && <div style={{ fontFamily: T.mono, fontSize: 13, color: cfg.color, fontWeight: 700 }}>{w} שב׳</div>}
              </button>
            );
          })}
        </Col>

        {state.goal.weight !== null && !stats.empty && (
          <GoalCalibrationCard />
        )}

        <Button onClick={save}>שמור יעד</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Goal calibration card — AI-driven recommendation based on actual pace
// ════════════════════════════════════════════════════════════════════
function GoalCalibrationCard() {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const cached = state.insights.calibration;
  const hasKey = apiReady(state.apiConfig);

  const isStale = cached && (Date.now() - new Date(cached.generatedAt).getTime()) > 7 * 24 * 3600 * 1000;

  const calibrate = async () => {
    if (!hasKey) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const snapshot = buildInsightSnapshot(state, stats, 21); // 3 weeks for pace context
      const text = await generateGoalCalibration(snapshot, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({
          type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          feature: 'goal_calibration',
          costUSD: cost,
        });
      }, state);
      dispatch({
        type: 'SET_INSIGHT', kind: 'calibration',
        payload: { text, generatedAt: new Date().toISOString() },
      });
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding={14} style={{
      marginBottom: 18, marginTop: 4,
      background: `linear-gradient(135deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${cached ? T.strokeHi : T.stroke}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: `${T.lime}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>כיול יעד חכם</div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
            השוואה בין הקצב המתוכנן לקצב בפועל
          </div>
        </div>
        {cached && !loading && (
          <button onClick={calibrate} style={{
            background: 'transparent', border: `1px solid ${T.stroke}`, color: T.inkSub,
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontFamily: T.mono,
            cursor: 'pointer',
          }}>רענן</button>
        )}
      </div>

      {loading ? (
        <LoadingPersona message="מכייל את היעד שלך..." />
      ) : cached ? (
        <>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.ink, whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {cached.text}
          </div>
          <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, marginTop: 10, textAlign: 'left', direction: 'ltr' }}>
            {fmt.relativeDay(cached.generatedAt.slice(0, 10))} · {isStale ? 'ישן' : 'עדכני'}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 12 }}>
            המנוע יבדוק את הקצב המתוכנן מול הקצב בפועל ב-3 השבועות האחרונים, ויציע התאמה למספר הקלוריות או ללוח הזמנים.
          </div>
          <button onClick={calibrate} disabled={!hasKey} style={{
            background: hasKey ? T.lime : T.bgElev2, color: hasKey ? T.bg : T.inkMute,
            border: 'none', padding: '10px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, fontFamily: T.font,
            cursor: hasKey ? 'pointer' : 'not-allowed', width: '100%',
          }}>
            {hasKey ? 'כייל בעזרת AI' : 'הגדר API בפרופיל'}
          </button>
        </>
      )}
    </Card>
  );
}
