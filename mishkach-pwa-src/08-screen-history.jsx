// ════════════════════════════════════════════════════════════════════
// 08-screen-history.jsx — Real history with delete
// ════════════════════════════════════════════════════════════════════

function HistoryScreen({ onNavigate }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const unit = state.settings.unit;
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [editEntry, setEditEntry] = React.useState(null);

  if (stats.empty) {
    return (
      <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>HISTORY · היסטוריה</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>כל המספרים שלך</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState icon="📊" title="אין עדיין נתונים" message="אחרי שתוסיף כמה שקילות, תראה כאן מגמות וגרפים." />
        </div>
      </div>
    );
  }

  const list = stats.list;
  const recent = [...list].reverse();
  const heightCm = state.user.heightCm;
  const bmi = bmiInfo(stats.current, heightCm);

  // DOW analysis — only show if we have ≥14 entries spread across different weeks
  const dowStats = list.length >= 14
    ? Array(7).fill(0).map((_, d) => {
        const vals = list.filter(x => x.dayOfWeek === d).map(x => x.weight);
        return { dow: d, avg: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, count: vals.length };
      }).filter(x => x.avg !== null)
    : [];

  const handleDelete = (date) => {
    const entryCopy = state.entries[date] ? { ...state.entries[date], _date: date } : null;
    dispatch({ type: 'DELETE_ENTRY', date });
    setConfirmDelete(null);
    if (entryCopy) {
      toast('השקילה נמחקה', {
        type: 'info',
        duration: 5000,
        actionLabel: 'בטל',
        onAction: () => {
          dispatch({
            type: 'UPSERT_ENTRY',
            date,
            weight: entryCopy.weight,
            time: entryCopy.time,
            note: entryCopy.note,
          });
        },
      });
    } else {
      toast('השקילה נמחקה', { type: 'info' });
    }
  };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>HISTORY · היסטוריה</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>כל המספרים שלך</div>
      </div>

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 20px' }}
      >
        {/* Main chart */}
        <Card padding={12} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>מגמה · {list.length} מדידות</div>
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
              {fmt.kg(stats.low.weight, unit)}–{fmt.kg(stats.peak.weight, unit)}
            </div>
          </div>
          <WeightChart data={list} goal={state.goal.weight} width={340} height={150} />
          <GapIndicator entries={list} />
        </Card>

        {/* Weekly insight */}
        <WeeklyInsightCard />

        {/* Plateau detector (shows only if plateau detected) */}
        <PlateauCard entries={list} />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <StatChip
            label="ירידה כוללת"
            value={fmt.signed(stats.startWeight - stats.current)}
            unit={fmt.unitLabel(unit)}
            sub={`מ-${fmt.kg(stats.startWeight, unit)}`}
            color={stats.startWeight > stats.current ? T.lime : T.rose}
          />
          {bmi && (
            <StatChip label="BMI נוכחי" value={bmi.bmi.toFixed(1)} sub={bmi.category} color={bmi.color} />
          )}
          {stats.deltaWeek !== null && (
            <StatChip
              label="שבוע אחרון"
              value={fmt.signed(stats.deltaWeek)}
              unit={fmt.unitLabel(unit)}
              color={stats.deltaWeek < 0 ? T.lime : T.rose}
            />
          )}
          <StatChip
            label="רצף · ימים"
            value={stats.streak}
            unit="ימים"
            color={T.amber}
          />
        </div>

        {/* Bar histogram */}
        {list.length >= 3 && (
          <Card padding={12} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>מדידות · היסטוגרמה</div>
            <BarHistogram data={list} width={340} height={100} color={T.lime} />
          </Card>
        )}

        {/* DOW analysis */}
        {dowStats.length >= 5 && <DowCard dowStats={dowStats} unit={unit} />}

        {/* Entries list */}
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
          {recent.length} מדידות · החלק שמאלה למחיקה
        </div>
        <Card padding={0}>
          {recent.map((d, i) => {
            const prev = recent[i + 1];
            const delta = prev ? d.weight - prev.weight : 0;
            const gapDays = prev ? daysBetweenISO(prev.date, d.date) : 0;
            return (
              <React.Fragment key={d.date}>
                <SwipeableEntry
                  entry={d} delta={delta} hasDelta={!!prev} unit={unit}
                  isLast={i === recent.length - 1 && gapDays < 3}
                  onDelete={() => setConfirmDelete(d)}
                  onClick={() => setEditEntry(d)}
                />
                {gapDays >= 3 && i < recent.length - 1 && (
                  <div style={{
                    padding: '8px 14px', background: T.bg, fontSize: 10,
                    color: T.inkMute, fontFamily: T.mono, textAlign: 'center',
                    borderBottom: `1px solid ${T.stroke}`,
                  }}>
                    ⋯ חור של {gapDays} ימים ⋯
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </Card>
      </PullToRefresh>

      <ConfirmDialog
        open={!!confirmDelete}
        title="למחוק שקילה?"
        message={confirmDelete
          ? `${fmt.day(confirmDelete.date)} · ${fmt.kg(confirmDelete.weight, unit)} ${fmt.unitLabel(unit)}\n\n${personaStr(state, 'confirm_delete_weight', 'השקילה תימחק לצמיתות. להמשיך?')}`
          : ''}
        confirmLabel="מחק"
        cancelLabel="ביטול"
        danger
        onConfirm={() => handleDelete(confirmDelete.date)}
        onCancel={() => setConfirmDelete(null)}
      />

      {editEntry && <EditWeightEntryDialog entry={editEntry} onClose={() => setEditEntry(null)} />}
    </div>
  );
}

// ─── Swipeable entry row ────────────────────────────────────────────
function SwipeableEntry({ entry, delta, hasDelta, unit, isLast, onDelete, onClick }) {
  const [swipeX, setSwipeX] = React.useState(0);
  const [moved, setMoved] = React.useState(false);
  const startX = React.useRef(0);
  const currentX = React.useRef(0);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setMoved(false);
    currentX.current = 0;
  };
  const onTouchMove = (e) => {
    currentX.current = e.touches[0].clientX - startX.current;
    if (Math.abs(currentX.current) > 8) setMoved(true);
    // Only allow swipe left (negative direction in RTL means revealing left-side action)
    if (currentX.current > 0) {
      setSwipeX(Math.min(80, currentX.current));
    } else {
      setSwipeX(0);
    }
  };
  const onTouchEnd = () => {
    if (swipeX > 40) {
      setSwipeX(80);
    } else {
      setSwipeX(0);
    }
  };

  const handleClick = () => {
    if (moved || swipeX > 0) return;
    onClick?.();
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: isLast ? 'none' : `1px solid ${T.stroke}` }}>
      {/* Delete action behind */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 80,
        background: T.rose, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button onClick={onDelete} style={{
          background: 'transparent', border: 'none', color: T.ink, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 8,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700 }}>מחק</span>
        </button>
      </div>

      {/* Entry */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: T.bgElev, transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 || swipeX === 80 ? 'transform 200ms' : 'none',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, width: 70 }}>
          <div>{fmt.dayShort(entry.date)}</div>
          {entry.time && <div style={{ fontSize: 9, color: T.inkMute, marginTop: 2 }}>{entry.time}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600 }}>
            {fmt.kg(entry.weight, unit)}<span style={{ fontSize: 11, color: T.inkMute }}> {fmt.unitLabel(unit)}</span>
          </div>
          {entry.note && <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.note}</div>}
        </div>
        {hasDelta && <DeltaBadge value={delta} unit="" size="sm" />}
        <button onClick={() => setSwipeX(swipeX === 0 ? 80 : 0)} style={{
          background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer', padding: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Day-of-week analysis card ──────────────────────────────────────
function DowCard({ dowStats, unit }) {
  const dowNames = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  const avgs = dowStats.map(x => x.avg);
  const maxAvg = Math.max(...avgs);
  const minAvg = Math.min(...avgs);
  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>לפי יום בשבוע</div>
      <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 12 }}>
        ממוצע משקל לפי יום. שימו לב: עם מגמת ירידה יציבה, הניתוח מתעוות.
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {dowStats.map(d => {
          const h = 30 + ((d.avg - minAvg) / (maxAvg - minAvg || 1)) * 60;
          const isHeavy = d.avg > (minAvg + maxAvg)/2;
          return (
            <div key={d.dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 9, fontFamily: T.mono, color: T.inkMute }}>{fmt.kg(d.avg, unit)}</div>
              <div style={{ width: '100%', height: `${h}%`, background: isHeavy ? T.rose : T.lime, opacity: 0.8, borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.font }}>{dowNames[d.dow]}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Weekly insight card
// ═════════════════════════════════════════════════════════════════════
function WeeklyInsightCard() {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const cached = state.insights.weekly;
  const hasKey = apiReady(state.apiConfig);

  // Check staleness: if more than 24h old, show "refresh" hint
  const isStale = cached && (Date.now() - new Date(cached.generatedAt).getTime()) > 24 * 3600 * 1000;

  const snapshot = React.useMemo(() => buildInsightSnapshot(state, stats, 7), [state, stats]);
  const tooSparse = snapshot.weight_entries_count < 3 && snapshot.nutrition_days_logged < 3;

  const generate = async () => {
    if (!hasKey) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const text = await generateWeeklyInsight(snapshot, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({
          type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          feature: 'weekly_insight',
          costUSD: cost,
        });
      }, state);
      dispatch({
        type: 'SET_INSIGHT', kind: 'weekly',
        payload: { text, generatedAt: new Date().toISOString(), weekEnding: todayISO() },
      });
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding={14} style={{
      marginBottom: 12,
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
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>תובנה שבועית</div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
            ניתוח חכם · 7 ימים אחרונים
          </div>
        </div>
        {cached && !loading && (
          <button onClick={generate} style={{
            background: 'transparent', border: `1px solid ${T.stroke}`, color: T.inkSub,
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontFamily: T.mono,
            cursor: 'pointer',
          }}>רענן</button>
        )}
      </div>

      {loading ? (
        <LoadingPersona message="מנתח את השבוע שלך..." />
      ) : cached ? (
        <>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.ink, whiteSpace: 'pre-wrap', marginTop: 4 }}>
            {cached.text}
          </div>
          <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, marginTop: 10, textAlign: 'left', direction: 'ltr' }}>
            {fmt.relativeDay(cached.weekEnding)} · {isStale ? 'ישן' : 'עדכני'}
          </div>
        </>
      ) : tooSparse ? (
        <div style={{ padding: '6px 4px', fontSize: 12, color: T.inkSub, lineHeight: 1.6 }}>
          אין עדיין מספיק נתונים לתובנה משמעותית. תוסיף עוד כמה שקילות וארוחות ונחזור לנושא.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 12 }}>
            המנוע יסתכל על {snapshot.weight_entries_count} שקילות ו-{snapshot.nutrition_days_logged} ימי תזונה מהשבוע ויכתוב לך 3 פסקאות.
          </div>
          <button onClick={generate} disabled={!hasKey} style={{
            background: hasKey ? T.lime : T.bgElev2, color: hasKey ? T.bg : T.inkMute,
            border: 'none', padding: '10px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, fontFamily: T.font,
            cursor: hasKey ? 'pointer' : 'not-allowed', width: '100%',
          }}>
            {hasKey ? 'נתח לי את השבוע' : 'הגדר API בפרופיל'}
          </button>
        </>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Plateau card — shows only if plateau detected (14+ days, <0.3kg variance)
// ═════════════════════════════════════════════════════════════════════
function PlateauCard({ entries }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const cached = state.insights.plateau;

  // Detect plateau: look at last 14+ days, check if variance is low
  const plateau = React.useMemo(() => {
    if (!entries || entries.length < 4) return null;
    const latest = entries[entries.length - 1];
    const fromDate = addDaysISO(latest.date, -14);
    const recent = entries.filter(e => e.date >= fromDate);
    if (recent.length < 3) return null;
    const weights = recent.map(r => r.weight);
    const range = Math.max(...weights) - Math.min(...weights);
    const spanDays = daysBetweenISO(recent[0].date, recent[recent.length - 1].date);
    // Plateau if spanning 14+ days with range < 0.5kg
    if (spanDays >= 14 && range < 0.5) {
      return { days: spanDays, range: Math.round(range * 10) / 10, count: recent.length };
    }
    return null;
  }, [entries]);

  if (!plateau && !cached) return null;

  const analyze = async () => {
    if (!apiReady(state.apiConfig)) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const snapshot = buildInsightSnapshot(state, stats, 21); // 3 weeks for plateau context
      snapshot.plateau_detected = plateau;
      const text = await generatePlateauAnalysis(snapshot, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({
          type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          feature: 'plateau_analysis',
          costUSD: cost,
        });
      }, state);
      dispatch({
        type: 'SET_INSIGHT', kind: 'plateau',
        payload: { text, generatedAt: new Date().toISOString(), periodDays: plateau?.days },
      });
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding={14} style={{
      marginBottom: 12,
      background: `${T.amber}10`, border: `1px solid ${T.amber}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 18 }}>🔍</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>Plateau זוהה</div>
          {plateau && (
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
              {plateau.days} ימים · שונות {plateau.range}ק״ג · {plateau.count} שקילות
            </div>
          )}
        </div>
        {cached && !loading && (
          <button onClick={() => dispatch({ type: 'CLEAR_INSIGHT', kind: 'plateau' })} style={{
            background: 'transparent', border: 'none', color: T.inkMute,
            fontSize: 18, cursor: 'pointer', padding: 4,
          }}>×</button>
        )}
      </div>

      {loading ? (
        <LoadingPersona message="בודק..." />
      ) : cached ? (
        <>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.ink, whiteSpace: 'pre-wrap' }}>
            {cached.text}
          </div>
          <button onClick={analyze} style={{
            marginTop: 10, background: 'transparent', border: `1px solid ${T.amber}55`,
            color: T.amber, padding: '6px 12px', borderRadius: 8, fontSize: 11,
            fontFamily: T.mono, cursor: 'pointer',
          }}>רענן ניתוח</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 10 }}>
            {personaStr(state, 'plateau_warning', `המשקל שלך יציב כבר ${plateau.days} ימים.`)}
            {' '}רוצה שאנסה להבין למה, לפי הנתונים?
          </div>
          <button onClick={analyze} disabled={!apiReady(state.apiConfig)} style={{
            background: apiReady(state.apiConfig) ? T.amber : T.bgElev2,
            color: apiReady(state.apiConfig) ? T.bg : T.inkMute,
            border: 'none', padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, fontFamily: T.font,
            cursor: apiReady(state.apiConfig) ? 'pointer' : 'not-allowed',
          }}>נתח plateau</button>
        </>
      )}
    </Card>
  );
}

// ─── Gap indicator under chart ──────────────────────────────────────
function GapIndicator({ entries }) {
  const gaps = findGaps(entries, 3);
  if (gaps.length === 0) return null;
  const total = gaps.reduce((s, g) => s + g.days, 0);
  return (
    <div style={{
      marginTop: 8, padding: '6px 10px', background: T.bgElev2, borderRadius: 8,
      fontSize: 10, color: T.inkMute, fontFamily: T.mono, textAlign: 'center',
    }}>
      {gaps.length} חורים במדידות · {total} ימים חסרים בסה״כ
    </div>
  );
}

// ─── Edit weight entry dialog — edit past weight without deleting ───
function EditWeightEntryDialog({ entry, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const unit = state.settings.unit;
  const [weight, setWeight] = React.useState(fmt.kg(entry.weight, unit));
  const [time, setTime] = React.useState(entry.time || '08:00');
  const [note, setNote] = React.useState(entry.note || '');
  const [date, setDate] = React.useState(entry.date);

  const wNum = parseFloat(weight);
  const valid = !isNaN(wNum) && wNum > 20 && wNum < 400;

  const save = () => {
    if (!valid) return;
    const weightKg = unit === 'lb' ? wNum / 2.20462 : wNum;
    if (date === entry.date) {
      dispatch({
        type: 'UPDATE_WEIGHT_ENTRY',
        date: entry.date,
        updates: { weight: Math.round(weightKg * 10) / 10, time, note: note.trim() },
      });
    } else {
      // Date changed: delete old, upsert new
      dispatch({ type: 'DELETE_ENTRY', date: entry.date });
      dispatch({
        type: 'UPSERT_ENTRY',
        date,
        weight: Math.round(weightKg * 10) / 10,
        time,
        note: note.trim(),
      });
    }
    toast(personaStr(state, 'meal_edited', 'השקילה עודכנה'), { type: 'success' });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 820,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>עריכת שקילה</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>משקל</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input value={weight} onChange={e => setWeight(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={{
            flex: 1, padding: '14px 16px',
            background: T.bgElev, border: `1px solid ${valid ? T.stroke : T.rose}`, borderRadius: 12,
            color: T.ink, fontSize: 22, fontFamily: T.mono, fontWeight: 600, outline: 'none',
            direction: 'ltr', textAlign: 'center',
          }} />
          <div style={{
            padding: '14px 16px', background: T.bgElev2, borderRadius: 12,
            color: T.inkSub, fontSize: 14, fontFamily: T.mono, display: 'flex', alignItems: 'center',
          }}>{fmt.unitLabel(unit)}</div>
        </div>

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>תאריך</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayISO()} style={{
          width: '100%', padding: '12px 14px', background: T.bgElev,
          border: `1px solid ${T.stroke}`, borderRadius: 10,
          color: T.ink, fontSize: 14, fontFamily: T.mono, outline: 'none', marginBottom: 16,
          direction: 'ltr', textAlign: 'left',
        }} />

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שעה</div>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
          width: '100%', padding: '12px 14px', background: T.bgElev,
          border: `1px solid ${T.stroke}`, borderRadius: 10,
          color: T.ink, fontSize: 14, fontFamily: T.mono, outline: 'none', marginBottom: 16,
          direction: 'ltr', textAlign: 'left',
        }} />

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>הערה</div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="לא חובה" style={{
          width: '100%', padding: '12px 14px', background: T.bgElev,
          border: `1px solid ${T.stroke}`, borderRadius: 10,
          color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
          direction: 'rtl', textAlign: 'right',
        }} />

        <div style={{ marginTop: 24 }}>
          <Button onClick={save} disabled={!valid}>שמור שינויים</Button>
        </div>
      </div>
    </div>
  );
}
