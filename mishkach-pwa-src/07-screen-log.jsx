// ════════════════════════════════════════════════════════════════════
// 07-screen-log.jsx — Weight entry with actual save to state
// ════════════════════════════════════════════════════════════════════
//
// v3.2 added back-date support: 4 quick chips (today/yesterday/two days
// ago/custom) + persona-aware overwrite confirmation if there's already
// a weight on the chosen date. Milestone toasts (goal reached, new low,
// trend) only fire for today's entries — back-filled days don't make
// sense to celebrate.

function LogScreen({ onClose, onSaved }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const unit = state.settings.unit;
  const today = todayISO();

  // ── Target date selector state ──────────────────────────────────────
  const [whenChoice, setWhenChoice] = React.useState('today'); // today | yesterday | twodays | custom
  const [customDate, setCustomDate] = React.useState(today);

  // Resolve which date the user is actually saving to
  const targetDate = React.useMemo(() => {
    if (whenChoice === 'today')     return today;
    if (whenChoice === 'yesterday') return addDaysISO(today, -1);
    if (whenChoice === 'twodays')   return addDaysISO(today, -2);
    return customDate;
  }, [whenChoice, customDate, today]);

  const isToday = targetDate === today;
  const existing = state.entries[targetDate];

  // ── Weight input — re-init only when targetDate changes (prevents the
  // input from snapping back while the user is typing) ────────────────
  const initialWeight = existing
    ? fmt.kg(existing.weight, unit)
    : stats.current !== null && stats.current !== undefined
      ? fmt.kg(stats.current, unit)
      : '70.0';

  const [weight, setWeight] = React.useState(initialWeight);
  const [note, setNote] = React.useState(existing?.note || '');
  const [showNote, setShowNote] = React.useState(!!existing?.note);
  // Confirm-dialog visibility for the overwrite warning
  const [confirmOverwrite, setConfirmOverwrite] = React.useState(false);
  // Confirm-dialog for unsaved-changes guard on close
  const [confirmCloseUnsaved, setConfirmCloseUnsaved] = React.useState(false);
  // QA1: tracks whether the user has actually typed since the screen / date
  // loaded a placeholder weight. The first keystroke REPLACES the placeholder
  // (97.0 → 8 should land on "8", not "97.08") — only subsequent keys append.
  const [hasUserTyped, setHasUserTyped] = React.useState(false);

  // When the date changes, reload weight + note from whatever's there
  React.useEffect(() => {
    setWeight(initialWeight);
    setNote(existing?.note || '');
    setShowNote(!!existing?.note);
    setHasUserTyped(false); // re-arm the placeholder-replace behavior
    // intentionally not depending on initialWeight (derived) — only on date
  }, [targetDate]);

  const handleKey = (k) => {
    // Backspace always edits in place + counts as "user typed"
    if (k === '⌫') {
      setHasUserTyped(true);
      return setWeight(w => w.length > 1 ? w.slice(0, -1) : '0');
    }
    if (k === '.' && weight.includes('.')) return;

    // QA1: first keystroke after open/date-change replaces the placeholder.
    if (!hasUserTyped) {
      setHasUserTyped(true);
      if (k === '.') return setWeight('0.');
      return setWeight(k);
    }
    if (weight === '0' && k !== '.') return setWeight(k);
    if (weight.replace('.','').length >= 5) return;
    setWeight(w => w + k);
  };

  const wNum = parseFloat(weight);
  // QA1: gate the save button at the kg level (after unit conversion). Below
  // 30 or above 300 is treated as invalid in the UI itself, not just at save.
  // The big-number color stays red for invalid input — visual warning preserved.
  const wKgForCheck = !isNaN(wNum) ? (unit === 'lb' ? wNum / 2.20462 : wNum) : NaN;
  const valid = !isNaN(wKgForCheck) && wKgForCheck >= 30 && wKgForCheck <= 300;

  // hasUnsavedChanges = the displayed weight no longer equals what's stored
  // for the target date (or what we'd default to if nothing's stored).
  // Only true if user typed AND the value differs from the placeholder.
  const hasUnsavedChanges = hasUserTyped && weight !== initialWeight;

  // Delta vs previous reference — only meaningful when saving today
  const deltaFromPrev = !isToday ? null : (
    valid && stats.current !== null && !existing
      ? wNum - stats.current
      : valid && existing
        ? wNum - (stats.previous !== null ? stats.previous : stats.current)
        : null
  );

  // ── Save logic — split so the confirm dialog can call the actual save
  // after the user clicks "החלף" ─────────────────────────────────────
  const performSave = () => {
    const weightKg = unit === 'lb' ? wNum / 2.20462 : wNum;
    const rounded = Math.round(weightKg * 10) / 10;

    // Extreme weight sanity check (always evaluated in kg, after unit conversion)
    if (rounded < 30) {
      toast(personaError(state, 'weight_too_low', 'המשקל נמוך מהטווח הסביר'), { type: 'error', duration: 4500 });
      return;
    }
    if (rounded > 300) {
      toast(personaError(state, 'weight_too_high', 'המשקל גבוה מהטווח הסביר'), { type: 'error', duration: 4500 });
      return;
    }

    // Time field: keep existing if editing, else "now" for today, else 08:00 default
    const timeForSave = existing?.time
      || (isToday ? nowHHMM() : '08:00');

    dispatch({
      type: 'UPSERT_ENTRY',
      date: targetDate,
      weight: rounded,
      time: timeForSave,
      note: note.trim(),
    });

    // Save toast — three branches: edited / today new / back-dated new
    if (existing) {
      const dateLabel = fmt.day(targetDate);
      toast(`השקילה של ${dateLabel} עודכנה`, { type: 'success' });
    } else if (isToday) {
      toast(personaStr(state, 'first_weight', 'נשמר!'), { type: 'success' });
    } else {
      // Back-dated, brand new entry — persona-aware
      toast(personaStr(state, 'weight_saved_backdated',
        `השקילה נרשמה ל-${fmt.day(targetDate)}.`,
        { DATE: fmt.day(targetDate) }
      ), { type: 'success' });
    }

    // ─── Milestone checks — only when saving TODAY for the first time ──
    // Back-dated entries don't trigger goal/PR/trend toasts because the
    // "current" stats are still anchored to the latest real day.
    if (!existing && isToday) {
      const goalKg = state.goal?.weight;
      const alreadyReached = state.settings.goalReachedAt;
      const startKg = state.user?.startWeight;

      // 1) GOAL REACHED — crossed the goal for the first time (lose direction only)
      if (goalKg !== null && goalKg !== undefined && !alreadyReached && startKg !== null) {
        const wantingToLose = startKg > goalKg;
        const reached = wantingToLose ? rounded <= goalKg : rounded >= goalKg;
        if (reached) {
          dispatch({ type: 'SET_SETTING', key: 'goalReachedAt', value: today });
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
          if (prevLow !== null && prevLow - rounded >= 0.1) {
            setTimeout(() => {
              toast(personaStr(state, 'new_low_weight', 'שיא חדש למטה!'), { type: 'success', duration: 5000 });
            }, 2800);
          }
        }
      }

      // 3) WEIGHT TREND — small up/down toast (significant delta only, >0.2 kg)
      const prevWeight = stats.current;
      if (prevWeight !== null) {
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

  // Top-level save handler — gates on overwrite confirmation
  const handleSave = () => {
    if (!valid) return;
    if (existing) {
      setConfirmOverwrite(true); // open confirm dialog; performSave() runs on confirm
      return;
    }
    performSave();
  };

  // Header label — depends on the chosen date
  const headerTitle = (() => {
    if (existing && isToday)        return 'עדכון שקילה של היום';
    if (existing && !isToday)       return `עדכון שקילה · ${fmt.day(targetDate)}`;
    if (!existing && isToday)       return 'הזנת משקל';
    return `הזנת משקל · ${fmt.day(targetDate)}`;
  })();

  // QA5: intercept close; if there are unsaved edits, warn first.
  const guardedClose = () => {
    if (hasUnsavedChanges) {
      setConfirmCloseUnsaved(true);
    } else {
      onClose?.();
    }
  };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={guardedClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          {headerTitle}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '12px 18px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
          {fmt.day(targetDate)}{isToday ? ` · ${nowHHMM()}` : ''}
        </div>
      </div>

      {/* Date chip selector */}
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[
            { k: 'today',     label: 'היום' },
            { k: 'yesterday', label: 'אתמול' },
            { k: 'twodays',   label: 'שלשום' },
            { k: 'custom',    label: 'אחר...' },
          ].map(opt => {
            const on = whenChoice === opt.k;
            // Show a tiny dot if there's already an entry on that date
            const dateForChip = opt.k === 'today'     ? today
                              : opt.k === 'yesterday' ? addDaysISO(today, -1)
                              : opt.k === 'twodays'   ? addDaysISO(today, -2)
                              : null;
            const hasEntry = dateForChip ? !!state.entries[dateForChip] : false;
            return (
              <button key={opt.k} onClick={() => setWhenChoice(opt.k)} style={{
                position: 'relative',
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                background: on ? T.lime : T.bgElev,
                color: on ? T.bg : T.inkSub,
                border: `1px solid ${on ? T.lime : T.stroke}`,
                fontSize: 12, fontWeight: 700, fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}>
                {opt.label}
                {hasEntry && !on && (
                  <span style={{
                    position: 'absolute', top: 4, left: 6,
                    width: 6, height: 6, borderRadius: 3, background: T.amber,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom date picker — only when "אחר..." chosen */}
        {whenChoice === 'custom' && (
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <input
              type="date"
              value={customDate}
              max={today}
              onChange={e => setCustomDate(e.target.value)}
              style={{
                padding: '8px 12px', background: T.bgElev,
                border: `1px solid ${T.stroke}`, borderRadius: 10,
                color: T.ink, fontSize: 13, fontFamily: T.mono, outline: 'none',
                direction: 'ltr', textAlign: 'left',
              }}
            />
          </div>
        )}

        {existing && (
          <div style={{ marginTop: 8, fontSize: 10, color: T.amber, fontFamily: T.mono, textAlign: 'center' }}>
            יש שקילה קיימת ב{isToday ? 'יום הזה' : `-${fmt.day(targetDate)}`} · {fmt.kg(existing.weight, unit)} {fmt.unitLabel(unit)}
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

      {/* Overwrite confirmation — persona-aware */}
      <ConfirmDialog
        open={confirmOverwrite}
        title="להחליף את הקיים?"
        message={existing
          ? personaStr(state, 'weight_overwrite_warning',
              `קיימת שקילה ב-${fmt.day(targetDate)}: ${fmt.kg(existing.weight, unit)} ק״ג. החלפה תדרוס את הקיים.`,
              { DATE: fmt.day(targetDate), OLD: fmt.kg(existing.weight, unit) }
            )
          : ''}
        confirmLabel="החלף"
        cancelLabel="ביטול"
        onConfirm={() => {
          setConfirmOverwrite(false);
          performSave();
        }}
        onCancel={() => setConfirmOverwrite(false)}
      />

      {/* QA5: unsaved-changes guard on close */}
      <ConfirmDialog
        open={confirmCloseUnsaved}
        title="לסגור בלי לשמור?"
        message={personaStr(state, 'unsaved_changes_warning',
          'יש שינויים שלא נשמרו. לסגור בכל זאת?')}
        confirmLabel="סגור בלי לשמור"
        cancelLabel="חזור"
        danger
        onConfirm={() => {
          setConfirmCloseUnsaved(false);
          onClose?.();
        }}
        onCancel={() => setConfirmCloseUnsaved(false)}
      />
    </div>
  );
}
