// ════════════════════════════════════════════════════════════════════
// 07-screen-log.jsx — Weight entry with actual save to state
// ════════════════════════════════════════════════════════════════════

function LogScreen({ onClose, onSaved }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const unit = state.settings.unit;
  const today = todayISO();
  const existing = state.entries[today];

  // If today has an entry, start with it; else use last entry as reference
  const initialWeight = existing
    ? fmt.kg(existing.weight, unit)
    : stats.current !== null && stats.current !== undefined
      ? fmt.kg(stats.current, unit)
      : '70.0';

  const [weight, setWeight] = React.useState(initialWeight);
  const [note, setNote] = React.useState(existing?.note || '');
  const [showNote, setShowNote] = React.useState(!!existing?.note);

  const handleKey = (k) => {
    if (k === '⌫') return setWeight(w => w.length > 1 ? w.slice(0, -1) : '0');
    if (k === '.' && weight.includes('.')) return;
    if (weight === '0' && k !== '.') return setWeight(k);
    if (weight.replace('.','').length >= 5) return;
    setWeight(w => w + k);
  };

  const wNum = parseFloat(weight);
  const valid = !isNaN(wNum) && wNum > 20 && wNum < 400;

  const deltaFromPrev = valid && stats.current !== null && !existing
    ? wNum - stats.current
    : valid && existing
      ? wNum - (stats.previous !== null ? stats.previous : stats.current)
      : null;

  const handleSave = () => {
    if (!valid) return;
    const weightKg = unit === 'lb' ? wNum / 2.20462 : wNum;
    const rounded = Math.round(weightKg * 10) / 10;

    dispatch({
      type: 'UPSERT_ENTRY',
      date: today,
      weight: rounded,
      time: nowHHMM(),
      note: note.trim(),
    });

    // Immediate toast for the save event
    if (existing) {
      toast('השקילה של היום עודכנה (רק אחת נשמרת ביום)', { type: 'success' });
    } else {
      toast(personaStr(state, 'first_weight', 'נשמר!'), { type: 'success' });
    }

    // ─── Milestone checks (only on new entries, not edits) ──────────
    if (!existing) {
      const goalKg = state.goal?.weight;
      const alreadyReached = state.settings.goalReachedAt;
      const startKg = state.user?.startWeight;

      // 1) GOAL REACHED — crossed the goal for the first time (lose direction only)
      if (goalKg !== null && goalKg !== undefined && !alreadyReached && startKg !== null) {
        const wantingToLose = startKg > goalKg;
        const reached = wantingToLose ? rounded <= goalKg : rounded >= goalKg;
        if (reached) {
          dispatch({ type: 'SET_SETTING', key: 'goalReachedAt', value: today });
          // Delayed toast so the first one doesn't get stomped
          setTimeout(() => {
            toast(personaStr(state, 'goal_reached', 'הגעת ליעד! 🎯'), { type: 'success', duration: 6000 });
          }, 1500);
        }
      }

      // 2) NEW LOW WEIGHT — rounded is lower than tracked lowest (only for loss journey)
      const prevLow = state.settings.lastLowWeight;
      const isLossJourney = startKg !== null && goalKg !== null && goalKg !== undefined && startKg > goalKg;
      if (isLossJourney) {
        if (prevLow === null || rounded < prevLow) {
          dispatch({ type: 'SET_SETTING', key: 'lastLowWeight', value: rounded });
          // Only celebrate if there was a previous low (not the very first entry)
          if (prevLow !== null && prevLow - rounded >= 0.1) {
            setTimeout(() => {
              toast(personaStr(state, 'new_low_weight', 'שיא חדש למטה!'), { type: 'success', duration: 5000 });
            }, 2800);
          }
        }
      }

      // 3) WEIGHT TREND — small up/down toast (significant delta only, >0.2 kg)
      const prevWeight = stats.current;
      if (prevWeight !== null && !existing) {
        const delta = rounded - prevWeight;
        if (delta <= -0.2) {
          setTimeout(() => {
            toast(personaStr(state, 'weight_down_small', 'ירידה קטנה במשקל'), { type: 'info' });
          }, 4000);
        } else if (delta >= 0.2) {
          setTimeout(() => {
            toast(personaStr(state, 'weight_up_small', 'עלייה קטנה במשקל'), { type: 'info' });
          }, 4000);
        }
      }

      // Bump persona interaction counter + check for sincerity moment
      dispatch({ type: 'INCREMENT_PERSONA_INTERACTIONS' });
      const newCount = (state.settings.personaInteractions || 0) + 1;
      // Check sincerity on the NEW count (counter is 1-indexed for the 20th interaction)
      if (newCount > 0 && newCount % 20 === 0) {
        const sincereLine = getSincerityLine({
          ...state,
          settings: { ...state.settings, personaInteractions: newCount },
        });
        if (sincereLine) {
          setTimeout(() => {
            toast(sincereLine, { type: 'success', duration: 7000 });
          }, 6000);
        }
      }
    }

    onSaved?.();
  };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          {existing ? 'עדכון שקילה של היום' : 'הזנת משקל'}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '16px 24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
          {fmt.day(today)} · {nowHHMM()}
        </div>
        {existing && (
          <div style={{ marginTop: 6, fontSize: 10, color: T.amber, fontFamily: T.mono }}>
            יש שקילה קיימת · שמירה תדרוס
          </div>
        )}
      </div>

      {/* Big number display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.mono, fontSize: 84, fontWeight: 600, color: valid ? T.lime : T.rose, letterSpacing: -4, lineHeight: 1 }}>
            {weight}
          </span>
          <span style={{ fontSize: 22, color: T.inkSub }}>{fmt.unitLabel(unit)}</span>
        </div>
        {deltaFromPrev !== null && (
          <div style={{ marginTop: 12, fontSize: 12, color: T.inkSub, fontFamily: T.mono, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{existing ? 'מול אתמול:' : 'מול האחרון:'}</span>
            <DeltaBadge value={deltaFromPrev} unit={fmt.unitLabel(unit)} size="sm" />
          </div>
        )}

        {showNote ? (
          <input
            value={note} onChange={e => setNote(e.target.value)} autoFocus
            placeholder="הערה (לא חובה)"
            style={{
              marginTop: 16, width: '100%', maxWidth: 280, padding: '8px 12px',
              background: T.bgElev, border: `1px solid ${T.stroke}`, borderRadius: 10,
              color: T.ink, fontSize: 13, fontFamily: T.font, outline: 'none',
              direction: 'rtl', textAlign: 'right',
            }}
          />
        ) : (
          <button onClick={() => setShowNote(true)} style={{
            marginTop: 16, background: 'transparent', border: 'none', color: T.inkSub,
            fontSize: 12, cursor: 'pointer', fontFamily: T.font,
          }}>+ הוסף הערה</button>
        )}
      </div>

      {/* Numeric pad */}
      <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} onClick={() => handleKey(k)} style={{
              height: 52, border: 'none', cursor: 'pointer',
              background: T.bgElev, color: T.ink, borderRadius: 12,
              fontFamily: T.mono, fontSize: 22, fontWeight: 600,
            }}
              onTouchStart={e => e.currentTarget.style.background = T.bgElev2}
              onTouchEnd={e => e.currentTarget.style.background = T.bgElev}
            >{k}</button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <Button onClick={handleSave} disabled={!valid}>
            {existing ? 'עדכן' : 'שמור'} · {weight} {fmt.unitLabel(unit)}
          </Button>
        </div>
      </div>
    </div>
  );
}
