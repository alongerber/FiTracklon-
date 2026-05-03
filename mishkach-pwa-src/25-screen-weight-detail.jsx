// ════════════════════════════════════════════════════════════════════
// 25-screen-weight-detail.jsx — v3.15
// ════════════════════════════════════════════════════════════════════
// Full-screen drill-down opened by tapping the weight on Home (or a
// weight-related card in MonthlyRecapDialog).
//
// Sections (in order):
//   1. Big current weight — date + time
//   2. שינוי — 4 deltas (yesterday/week/month/start). Each row hidden
//      individually if no qualifying earlier entry exists.
//   3. נתונים — 6 stats (furthest/closest to goal, 7d avg, 30d avg,
//      count, pace). Each row hidden if its data isn't computable.
//   4. גרף — 30-day chart (or all data if fewer days)
//   5. כל השקילות — full reverse-chronological list, optional date
//      highlight when navigated from a record row.
//
// Min-data is handled per-row, not all-or-nothing: a user with 4
// weigh-ins still sees yesterday + start deltas + max/min, even if
// 7-day / 30-day averages and pace aren't available yet.
//
// Language note: per spec we never call the maximum weight "שיא"
// or the minimum "שפל" — those terms are reserved for the user's
// goal-direction-aware "הכי רחוק/קרוב מהיעד". When no goal is set,
// fall back to the neutral "המקסימום" / "המינימום".
//
// `params` shape (passed by Router):
//   { monthYM?: 'YYYY-MM', focusDate?: 'YYYY-MM-DD' }
// Both optional; if neither given, the screen shows all-time data.

function WeightDetailScreen({ params = null, onClose, onNavigate }) {
  const { state, stats } = useStore();
  const unit = state.settings.unit;
  const goal = state.goal.weight;

  // Filter the entries list
  const filtered = React.useMemo(() => {
    if (!params?.monthYM) return stats.list || [];
    const prefix = params.monthYM + '-';
    return (stats.list || []).filter(e => e.date.startsWith(prefix));
  }, [stats.list, params]);

  const detail = React.useMemo(
    () => computeWeightDetailStats(filtered, state, unit, goal),
    [filtered, state, unit, goal]
  );

  // For the "back" header label, show the period being viewed
  const headerLabel = params?.monthYM
    ? monthDisplayName(params.monthYM)
    : 'משקל';

  return (
    <div style={{
      background: T.bg, color: T.ink, fontFamily: T.font,
      height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="חזור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          {headerLabel}
        </div>
        <div style={{ width: 36 }} />
      </div>

      {!detail ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon="⚖️"
            title="אין שקילות"
            message={params?.monthYM ? 'בחודש הזה לא נרשמו שקילות.' : 'הוסף שקילה ראשונה כדי לראות נתונים מפורטים.'}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 32px' }}>
          {/* ─── 1. Big current weight ──────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 64, fontWeight: 600, color: T.ink,
              letterSpacing: -3, lineHeight: 1,
            }}>
              {fmt.kg(detail.current, unit)}
            </div>
            <div style={{ fontSize: 12, color: T.inkSub, marginTop: 6, fontFamily: T.mono }}>
              {fmt.unitLabel(unit)} · {fmt.relativeDay(detail.latestDate)}{detail.latestTime ? ` · ${detail.latestTime}` : ''}
            </div>
          </div>

          {/* ─── 2. שינוי ──────────────────────────────────── */}
          {detail.deltas.length > 0 && (
            <Card padding={14} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10 }}>
                שינוי
              </div>
              {detail.deltas.map((d, i) => (
                <DetailRow key={d.label}
                  label={d.label}
                  value={<DeltaValue value={d.value} unit={fmt.unitLabel(unit)} />}
                  isLast={i === detail.deltas.length - 1}
                />
              ))}
            </Card>
          )}

          {/* ─── 3. נתונים ─────────────────────────────────── */}
          {detail.dataRows.length > 0 && (
            <Card padding={14} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10 }}>
                נתונים
              </div>
              {detail.dataRows.map((r, i) => (
                <DetailRow key={r.label}
                  label={r.label}
                  value={r.value}
                  date={r.date}
                  isLast={i === detail.dataRows.length - 1}
                  onClick={r.date ? () => {
                    // Tapping a record row scrolls the list below into focus
                    const el = document.getElementById(`weight-row-${r.date}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } : undefined}
                />
              ))}
            </Card>
          )}

          {/* ─── 4. Chart (30-day window from latest, or all if fewer) ─── */}
          {detail.chartData.length >= 2 && (
            <Card padding={12} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                {detail.chartData.length === filtered.length
                  ? `מגמה · ${detail.chartData.length} מדידות`
                  : `30 ימים אחרונים · ${detail.chartData.length} מדידות`}
              </div>
              <WeightChart data={detail.chartData} goal={goal}
                width={340} height={170} showDots={true} />
            </Card>
          )}

          {/* ─── 5. All weights list (reverse chronological) ─── */}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '12px 14px',
              fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1,
              borderBottom: `1px solid ${T.stroke}`,
            }}>
              כל השקילות · {filtered.length}
            </div>
            <WeightsListReverse
              entries={filtered}
              unit={unit}
              focusDate={params?.focusDate || null}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Helper: pick the entry closest to (latest - daysBack) within a window ───
// Returns null if no entry exists inside [target - tolerance, target + tolerance].
function findEntryNearOffset(list, daysBack, tolerance = 2) {
  if (!list || list.length === 0) return null;
  const latest = list[list.length - 1];
  const target = addDaysISO(latest.date, -daysBack);
  const lo = addDaysISO(target, -tolerance);
  const hi = addDaysISO(target, tolerance);
  let best = null;
  let bestDiff = Infinity;
  for (let i = 0; i < list.length - 1; i++) {  // exclude latest itself
    const d = list[i].date;
    if (d < lo || d > hi) continue;
    const diff = Math.abs(daysBetweenISO(d, target));
    if (diff < bestDiff) { best = list[i]; bestDiff = diff; }
  }
  return best;
}

// ─── Compute everything WeightDetailScreen needs in one pass ────────
function computeWeightDetailStats(list, state, unit, goal) {
  if (!list || list.length === 0) return null;
  const latest = list[list.length - 1];
  const current = latest.weight;

  const userStart = state.user?.startWeight;
  // Use user.startWeight when relevant (matches Home's "מההתחלה" semantics);
  // otherwise fall back to the first entry in the filtered list.
  const startWeightForDelta = (userStart !== null && userStart !== undefined) ? userStart : list[0].weight;

  // ─── Deltas (each row hidden if its anchor doesn't exist) ───
  const yest  = findEntryNearOffset(list, 1, 1);
  const week  = findEntryNearOffset(list, 7, 2);
  const month = findEntryNearOffset(list, 30, 4);
  const deltas = [];
  if (yest)  deltas.push({ label: 'מאתמול', value: current - yest.weight });
  if (week)  deltas.push({ label: 'משבוע',  value: current - week.weight });
  if (month) deltas.push({ label: 'מחודש',  value: current - month.weight });
  if (startWeightForDelta !== null && startWeightForDelta !== undefined && startWeightForDelta !== current) {
    deltas.push({ label: 'מההתחלה', value: current - startWeightForDelta });
  }

  // ─── Records (max/min with goal-aware naming) ───
  const max = list.reduce((a, b) => b.weight > a.weight ? b : a);
  const min = list.reduce((a, b) => b.weight < a.weight ? b : a);
  const dataRows = [];

  // Goal-aware "furthest/closest" labeling. If no goal, use neutral
  // "המקסימום/המינימום" — never "שיא"/"שפל" (those imply a direction
  // that doesn't fit weight loss tracking).
  if (goal !== null && goal !== undefined && max.weight !== min.weight) {
    const wantsToLose = startWeightForDelta > goal;
    const furthest = wantsToLose ? max : min;
    const closest  = wantsToLose ? min : max;
    dataRows.push({
      label: 'הכי רחוק מהיעד',
      value: fmt.kg(furthest.weight, unit) + ' ' + fmt.unitLabel(unit),
      date: furthest.date,
    });
    dataRows.push({
      label: 'הכי קרוב ליעד',
      value: fmt.kg(closest.weight, unit) + ' ' + fmt.unitLabel(unit),
      date: closest.date,
    });
  } else if (max.weight !== min.weight) {
    dataRows.push({
      label: 'המקסימום',
      value: fmt.kg(max.weight, unit) + ' ' + fmt.unitLabel(unit),
      date: max.date,
    });
    dataRows.push({
      label: 'המינימום',
      value: fmt.kg(min.weight, unit) + ' ' + fmt.unitLabel(unit),
      date: min.date,
    });
  }

  // ─── 7-day average (only if ≥3 entries inside that window) ───
  const today = todayISO();
  const cutoff7  = addDaysISO(today, -7);
  const cutoff30 = addDaysISO(today, -30);
  const inRange = (cutoff) => list.filter(e => e.date >= cutoff);
  const avg = (xs) => xs.reduce((s, e) => s + e.weight, 0) / xs.length;

  const inWindow7  = inRange(cutoff7);
  const inWindow30 = inRange(cutoff30);
  if (inWindow7.length >= 3) {
    dataRows.push({
      label: 'ממוצע 7 ימים',
      value: fmt.kg(avg(inWindow7), unit) + ' ' + fmt.unitLabel(unit),
      date: null,
    });
  }
  if (inWindow30.length >= 3 && inWindow30.length > inWindow7.length) {
    dataRows.push({
      label: 'ממוצע 30 ימים',
      value: fmt.kg(avg(inWindow30), unit) + ' ' + fmt.unitLabel(unit),
      date: null,
    });
  }

  // ─── Count ───
  dataRows.push({
    label: 'מספר שקילות',
    value: `${list.length}`,
    date: null,
  });

  // ─── Pace (kg/week, computed from filtered range) ───
  let pace = null;
  if (list.length >= 2) {
    const days = daysBetweenISO(list[0].date, latest.date);
    if (days >= 7) {
      pace = ((latest.weight - list[0].weight) / days) * 7;
    }
  }
  if (pace !== null && Math.abs(pace) >= 0.05) {
    const direction = pace < 0 ? 'ירידה' : 'עלייה';
    dataRows.push({
      label: `קצב ${direction}`,
      value: `${Math.abs(pace).toFixed(2)} ${fmt.unitLabel(unit)}/שב׳`,
      date: null,
    });
  }

  // Chart: last 30 days from the filtered list (or all if fewer)
  const chartCutoff = addDaysISO(latest.date, -30);
  const chartData = list.filter(e => e.date >= chartCutoff);

  return {
    current,
    latestDate: latest.date,
    latestTime: latest.time,
    deltas,
    dataRows,
    chartData,
  };
}

// ─── Pretty rows used in both sections ─────────────────────────────
function DetailRow({ label, value, date, isLast, onClick }) {
  const dateLabel = date ? fmt.dayShort(date) : '';
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${T.stroke}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: 3,
        background: T.lime, opacity: 0.7, flexShrink: 0,
      }} />
      <div style={{ flex: 1, fontSize: 13, color: T.inkSub }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.ink }}>
          {value}
        </div>
        {dateLabel && (
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, minWidth: 56, textAlign: 'left' }}>
            {dateLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline ↑↓ with color
function DeltaValue({ value, unit }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span style={{ color: T.inkMute }}>—</span>;
  }
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  const arrow = value < 0 ? '↓' : value > 0 ? '↑' : '·';
  const color = value < 0 ? T.lime : value > 0 ? T.rose : T.inkMute;
  const abs = Math.abs(value);
  return (
    <span style={{ color, fontFamily: T.mono, fontWeight: 700 }}>
      {sign}{abs.toFixed(1)} {arrow}
    </span>
  );
}

// Reverse-chronological list of every weigh-in. Each row has a stable id
// so DetailRow's onClick can scroll-into-view by date.
function WeightsListReverse({ entries, unit, focusDate }) {
  if (!entries || entries.length === 0) return null;
  const reversed = [...entries].reverse();
  return (
    <div>
      {reversed.map((e, i) => {
        const isFocused = focusDate && e.date === focusDate;
        return (
          <div
            key={e.date}
            id={`weight-row-${e.date}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: isFocused ? `${T.lime}15` : 'transparent',
              borderBottom: i === reversed.length - 1 ? 'none' : `1px solid ${T.stroke}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                {fmt.day(e.date)}
              </div>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginTop: 2 }}>
                {e.time || '—'}{e.note ? ` · ${e.note}` : ''}
              </div>
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 17, fontWeight: 700,
              color: T.ink, letterSpacing: -0.5,
            }}>
              {fmt.kg(e.weight, unit)}
              <span style={{ fontSize: 11, color: T.inkSub, fontWeight: 600, marginRight: 4 }}>
                {fmt.unitLabel(unit)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
