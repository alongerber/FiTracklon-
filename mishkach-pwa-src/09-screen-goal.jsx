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

        <Button onClick={save}>שמור יעד</Button>
      </div>
    </div>
  );
}
