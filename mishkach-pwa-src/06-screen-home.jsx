// ════════════════════════════════════════════════════════════════════
// 06-screen-home.jsx — Home V1/V2/V3 adapted to real data
// ════════════════════════════════════════════════════════════════════

function HomeScreen({ onNavigate }) {
  const { state } = useStore();
  const variant = state.settings.homeVariant || 'v1';
  if (variant === 'v2') return <HomeV2 onNavigate={onNavigate} />;
  if (variant === 'v3') return <HomeV3 onNavigate={onNavigate} />;
  return <HomeV1 onNavigate={onNavigate} />;
}

// ════════════════════════════════════════════════════════════════════
// E3 — Calendar awareness
// ════════════════════════════════════════════════════════════════════
//
// Static list of Jewish holidays for 2026-2027 in Gregorian dates.
// IMPORTANT: dates were computed from typical Hebrew calendar mappings
// but should be verified against an authoritative Hebrew calendar
// before 2027. If a date is wrong, the only consequence is the banner
// showing on the wrong day — no data corruption.
//
// kind: 'holiday' (yom tov) | 'eve' (erev chag) | 'minor' (purim, lag baomer)
const HOLIDAYS = [
  // ── 5786 / 2026 ─────────────────────────────────────────────────
  { date: '2026-03-03', name: 'פורים',           emoji: '🎭', kind: 'minor' },
  { date: '2026-04-01', name: 'ערב פסח',         emoji: '🍷', kind: 'eve' },
  { date: '2026-04-02', name: 'פסח',             emoji: '🍷', kind: 'holiday' },
  { date: '2026-04-08', name: 'שביעי של פסח',    emoji: '🍷', kind: 'holiday' },
  { date: '2026-04-14', name: 'יום השואה',       emoji: '🕯️', kind: 'minor' },
  { date: '2026-04-22', name: 'יום הזיכרון',     emoji: '🇮🇱', kind: 'minor' },
  { date: '2026-04-23', name: 'יום העצמאות',     emoji: '🇮🇱', kind: 'holiday' },
  { date: '2026-05-05', name: 'ל״ג בעומר',       emoji: '🔥', kind: 'minor' },
  { date: '2026-05-22', name: 'שבועות',          emoji: '🌾', kind: 'holiday' },
  { date: '2026-09-12', name: 'ערב ראש השנה',    emoji: '🍯', kind: 'eve' },
  { date: '2026-09-13', name: 'ראש השנה',        emoji: '🍯', kind: 'holiday' },
  { date: '2026-09-21', name: 'יום כיפור',       emoji: '🤍', kind: 'holiday' },
  { date: '2026-09-26', name: 'סוכות',           emoji: '🌿', kind: 'holiday' },
  { date: '2026-10-04', name: 'שמחת תורה',       emoji: '📜', kind: 'holiday' },
  { date: '2026-12-05', name: 'חנוכה',           emoji: '🕎', kind: 'minor' },
  // ── 5787 / 2027 (verify before use!) ───────────────────────────
  { date: '2027-03-23', name: 'פורים',           emoji: '🎭', kind: 'minor' },
  { date: '2027-04-21', name: 'ערב פסח',         emoji: '🍷', kind: 'eve' },
  { date: '2027-04-22', name: 'פסח',             emoji: '🍷', kind: 'holiday' },
];

function getHolidayForDate(iso) {
  return HOLIDAYS.find(h => h.date === iso) || null;
}

// Get a display tag for today: holiday > friday > saturday > null
function todayBannerKind(iso) {
  const h = getHolidayForDate(iso);
  if (h) return { kind: 'holiday', holiday: h };
  const dow = parseDOWFromISO(iso);
  if (dow === 5) return { kind: 'friday' };
  if (dow === 6) return { kind: 'saturday' };
  return null;
}

// Find any holiday whose date falls within [fromISO, toISO] inclusive.
// Used by AI prompts to add "this period included [holiday]" context.
function holidaysInRange(fromISO, toISO) {
  return HOLIDAYS.filter(h => h.date >= fromISO && h.date <= toISO);
}

// ─── DayBanner component — shown at top of HomeV1/V2/V3 ────────────
function DayBanner() {
  const { state, dispatch } = useStore();
  const today = todayISO();
  const dismissed = state.settings.dismissedDayBanner === today;
  if (dismissed) return null;

  const tag = todayBannerKind(today);
  if (!tag) return null;

  // Pick the right STRINGS key + vars
  let key, vars = {};
  let bgColor = T.bgElev2, accent = T.cyan;
  if (tag.kind === 'holiday') {
    key = 'banner_holiday';
    vars = { NAME: tag.holiday.name, EMOJI: tag.holiday.emoji };
    accent = tag.holiday.kind === 'holiday' ? T.amber : T.cyan;
  } else if (tag.kind === 'friday') {
    key = 'banner_friday';
    accent = T.amber;
  } else {
    key = 'banner_saturday';
    accent = T.lime;
  }

  const text = personaStr(state, key, '', vars);
  if (!text) return null;

  return (
    <div style={{
      margin: '4px 18px 6px', padding: '8px 10px 8px 12px',
      background: `${accent}15`, border: `1px solid ${accent}44`,
      borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
      direction: 'rtl',
    }}>
      <div style={{ flex: 1, fontSize: 12, color: accent, lineHeight: 1.5 }}>
        {text}
      </div>
      <button
        onClick={() => dispatch({ type: 'SET_SETTING', key: 'dismissedDayBanner', value: today })}
        aria-label="הסתר באנר"
        style={{
          background: 'transparent', border: 'none', color: accent,
          cursor: 'pointer', padding: 4, fontSize: 16, opacity: 0.7,
        }}>×</button>
    </div>
  );
}

// ─── Shared top bar ─────────────────────────────────────────────────
function HomeHeader({ compact = false, onNavigate }) {
  const { state, stats } = useStore();
  const name = state.user.name || 'אתה';
  const letter = name[0] || 'U';
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';
  return (
    <div style={{ padding: '14px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <AvatarDot letter={letter} size={compact ? 28 : 32} />
      {/* QA19: name + greeting must not crowd the badges. minWidth: 0 lets
          the flex item shrink; ellipsis truncates long names (Hebrew names
          like ישראל ישראלי-כהן can overflow). */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: T.inkMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{greet}</div>
        <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      </div>
      <WorkoutStreakBadge onNavigate={onNavigate} />
      <StreakBadge days={stats.streak} />
    </div>
  );
}

// ─── Workout streak badge — only shown when streak >= 2 ─────────────
function WorkoutStreakBadge({ onNavigate }) {
  const { state } = useStore();
  const sessions = state.workouts?.sessions || {};
  const days = workoutStreak(sessions);
  if (days < 2) return null;
  return (
    <button
      onClick={() => onNavigate?.('workout')}
      aria-label={`רצף אימון ${days} ימים`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px 4px 8px', borderRadius: 999,
        background: `${T.cyan}22`, color: T.cyan,
        border: `1px solid ${T.cyan}55`,
        fontFamily: T.mono, fontSize: 12, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <TabIcon name="dumbbell" size={13} />
      {days} ימים
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// V1 — Dashboard (default, most informative)
// ════════════════════════════════════════════════════════════════════
function HomeV1({ onNavigate }) {
  const { state, stats } = useStore();
  const unit = state.settings.unit;
  const goal = state.goal.weight;

  // No entries edge case
  if (stats.empty) {
    return (
      <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
        <HomeHeader onNavigate={onNavigate} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, maxWidth: 320 }}>
            <img src="./logo-welcome.png" alt="מִשְׁקַלּוּת" style={{
              width: 140, height: 140, objectFit: 'contain', borderRadius: 30,
              boxShadow: `0 0 50px ${T.lime}33, 0 10px 30px rgba(0,0,0,0.4)`,
            }} />
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>בוא נתחיל</div>
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6 }}>
              הוסף את השקילה הראשונה שלך כדי לראות מגמות וסטטיסטיקות.
            </div>
            <div style={{ width: '100%', maxWidth: 260, marginTop: 8 }}>
              <Button onClick={() => onNavigate('log')}>הוסף שקילה</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = stats.progressPct;
  const toGoalAbs = goal !== null && goal !== undefined ? Math.abs(stats.toGoal) : null;
  const chartData = stats.list.slice(-30);

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <HomeHeader onNavigate={onNavigate} />
      <DayBanner />
      <MonthlyRecapButton onNavigate={onNavigate} />

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}
      >
        {/* Hero */}
        <Card padding={18} style={{ background: `linear-gradient(145deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`, border: `1px solid ${T.strokeHi}`, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: T.inkMute, letterSpacing: 0.4 }}>משקל נוכחי · {fmt.relativeDay(stats.latestDate)}</div>
              <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>{fmt.day(stats.latestDate)} · {stats.latestTime}</div>
            </div>
            {stats.deltaWeek !== null && (
              <Pill color={stats.deltaWeek < 0 ? T.lime : T.rose} size="sm">
                {stats.deltaWeek < 0 ? 'ירידה' : 'עלייה'} {fmt.signed(stats.deltaWeek)} ק״ג/שבוע
              </Pill>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: T.mono, fontSize: 72, fontWeight: 600, color: T.ink, letterSpacing: -3, lineHeight: 1 }}>
              {fmt.kg(stats.current, unit)}
            </span>
            <span style={{ fontSize: 20, color: T.inkSub, fontWeight: 600 }}>{fmt.unitLabel(unit)}</span>
            <div style={{ flex: 1 }} />
            <DeltaBadge value={stats.dayDelta} unit={fmt.unitLabel(unit)} size="md" />
          </div>

          {/* Progress bar */}
          {progress !== null && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.inkSub, marginBottom: 6 }}>
                <span>התחלה · {fmt.kg(stats.startWeight, unit)}</span>
                <span style={{ color: progress >= 95 ? T.lime : progress >= 70 ? T.amber : T.lime, fontFamily: T.mono, fontWeight: 700 }}>
                  {progress.toFixed(0)}%{progress >= 95 ? ' · כמעט שם!' : progress >= 70 ? ' · קרוב' : ''}
                </span>
                <span>יעד · {fmt.kg(goal, unit)}</span>
              </div>
              <div style={{ height: 6, background: T.stroke, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${T.amber}, ${T.lime})`, borderRadius: 3 }} />
              </div>
              {stats.etaDays !== null ? (
                <div style={{ fontSize: 12, color: T.inkSub, marginTop: 10, textAlign: 'center' }}>
                  עוד <span style={{ color: T.ink, fontFamily: T.mono, fontWeight: 700 }}>{fmt.kg(toGoalAbs, unit)}</span> ליעד · בקצב הנוכחי, <span style={{ color: T.lime, fontWeight: 700 }}>{stats.etaDays} ימים</span>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: T.inkMute, marginTop: 10, textAlign: 'center' }}>
                  {(() => {
                    if (toGoalAbs === null) return 'הגדר יעד כדי לראות התקדמות';
                    if (stats.etaReason === 'reached') return `הגעת ליעד! ${fmt.kg(toGoalAbs, unit)} ק״ג מהמטרה`;
                    if (stats.etaReason === 'wrong_direction') return `עוד ${fmt.kg(toGoalAbs, unit)} ק״ג ליעד · המגמה כרגע בכיוון ההפוך`;
                    if (stats.etaReason === 'no_pace') return `עוד ${fmt.kg(toGoalAbs, unit)} ק״ג ליעד · המשקל יציב, אין קצב לחזות`;
                    if (stats.etaReason === 'insufficient_data') return `עוד ${fmt.kg(toGoalAbs, unit)} ק״ג ליעד · צריך לפחות 3 שקילות לחיזוי`;
                    return `עוד ${fmt.kg(toGoalAbs, unit)} ק״ג ליעד`;
                  })()}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Tip of day — value-added insight */}
        <CreativeTipOfDay />

        {/* Chart card */}
        <Card padding={12} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>מגמה · {chartData.length} מדידות אחרונות</div>
            <button onClick={() => onNavigate('history')} style={{
              background: 'transparent', border: 'none', color: T.lime,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
            }}>הכל ›</button>
          </div>
          {/* QA18: a single point isn't a "trend" — show a hint instead of a one-dot chart */}
          {chartData.length < 3 ? (
            <div style={{
              padding: '36px 16px', textAlign: 'center', background: T.bg, borderRadius: 8,
              fontSize: 12, color: T.inkSub, lineHeight: 1.6,
            }}>
              📊 הוסף עוד {3 - chartData.length} מדידות לראות מגמה
            </div>
          ) : (
            <WeightChart data={chartData} goal={goal} width={320} height={160} />
          )}
        </Card>

        {/* Nutrition mini widget */}
        <NutritionWidget onNavigate={onNavigate} />

        {/* F1 — auto-detected patterns from 30 days of data */}
        <CorrelationsCard />

        {/* F2 — what-if forward projection */}
        <WhatIfCard />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
          <StatChip label="שבוע אחרון" value={stats.deltaWeek !== null ? fmt.signed(stats.deltaWeek) : '—'} unit={stats.deltaWeek !== null ? fmt.unitLabel(unit) : ''} color={stats.deltaWeek < 0 ? T.lime : T.rose} />
          <StatChip label="חודש אחרון" value={stats.deltaMonth !== null ? fmt.signed(stats.deltaMonth) : '—'} unit={stats.deltaMonth !== null ? fmt.unitLabel(unit) : ''} color={stats.deltaMonth < 0 ? T.lime : T.rose} />
          <StatChip label="שיא" value={fmt.kg(stats.peak.weight, unit)} unit={fmt.unitLabel(unit)} sub={fmt.day(stats.peak.date)} color={T.rose} />
          <StatChip label="שפל" value={fmt.kg(stats.low.weight, unit)} unit={fmt.unitLabel(unit)} sub={fmt.day(stats.low.date)} color={T.lime} />
        </div>

        {/* Goal CTA if no goal */}
        {goal === null && (
          <Card padding={14} style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}44`, cursor: 'pointer' }} onClick={() => onNavigate('goal')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 22 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>הגדר יעד</div>
                <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>כדי לראות התקדמות ו-ETA</div>
              </div>
              <span style={{ color: T.amber, fontSize: 18 }}>‹</span>
            </div>
          </Card>
        )}
      </PullToRefresh>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// V2 — Velocity (speedometer)
// ════════════════════════════════════════════════════════════════════
function HomeV2({ onNavigate }) {
  const { state, stats } = useStore();
  const unit = state.settings.unit;
  const goal = state.goal.weight;

  if (stats.empty) {
    return (
      <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
        <HomeHeader onNavigate={onNavigate} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <EmptyState icon="⚖️" title="בוא נתחיל" message="הוסף שקילה ראשונה כדי לראות מד מהירות."
            action={<Button onClick={() => onNavigate('log')}>הוסף שקילה</Button>} />
        </div>
      </div>
    );
  }

  const pace = stats.paceKgPerWeek;
  const maxPace = 1.2;
  const velocityNormalized = pace !== null
    ? Math.max(-1, Math.min(1, -pace / maxPace))
    : 0;

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>מהירות · קצב שבועי</div>
        <WorkoutStreakBadge onNavigate={onNavigate} />
        <StreakBadge days={stats.streak} />
        <AvatarDot letter={(state.user.name || 'U')[0]} size={28} />
      </div>
      <DayBanner />
      <MonthlyRecapButton onNavigate={onNavigate} />

      {/* Streak milestone message — shows the last milestone passed, not just exact match */}
      {(() => {
        const milestones = [2, 3, 5, 7, 10, 14, 30];
        // Find the highest milestone that is <= current streak
        const passed = milestones.filter(m => stats.streak >= m);
        if (passed.length === 0) return null;
        const milestone = passed[passed.length - 1];
        // Only show for 7 days after passing the milestone, to avoid forever-stale
        const daysSinceMilestone = stats.streak - milestone;
        if (daysSinceMilestone > 7) return null;
        const msg = personaStr(state, `streak_${milestone}`, '');
        if (!msg) return null;
        return (
          <div style={{
            margin: '4px 18px 8px', padding: '8px 12px',
            background: `${T.amber}15`, border: `1px solid ${T.amber}44`,
            borderRadius: 10, fontSize: 12, color: T.amber, lineHeight: 1.5, direction: 'rtl',
          }}>{msg}</div>
        );
      })()}

      {/* Missed day banner — last weigh was yesterday or earlier (1-6 days ago) */}
      {(() => {
        if (!stats.latestDate) return null;
        const today = todayISO();
        if (stats.latestDate === today) return null; // already weighed today
        const daysAgo = daysBetweenISO(stats.latestDate, today);
        if (daysAgo < 1 || daysAgo > 6) return null; // only show 1-6 days
        let key;
        if (daysAgo === 1) key = 'missed_day_1';
        else if (daysAgo <= 3) key = 'missed_day_3';
        else key = 'missed_day_7';
        const msg = personaStr(state, key, '');
        if (!msg) return null;
        return (
          <div style={{
            margin: '4px 18px 8px', padding: '8px 12px',
            background: `${T.rose}10`, border: `1px solid ${T.rose}33`,
            borderRadius: 10, fontSize: 12, color: T.rose, lineHeight: 1.5, direction: 'rtl',
          }}>{msg}</div>
        );
      })()}

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}
      >
        {/* Velocity gauge hero */}
        <div style={{ position: 'relative', marginTop: 4, marginBottom: 10 }}>
          <ArcGauge value={velocityNormalized} color={velocityNormalized > 0 ? T.lime : velocityNormalized < 0 ? T.rose : T.inkMute} size={320} />
          <div style={{ position: 'absolute', bottom: 16, left: 18, fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>+1.2</div>
          <div style={{ position: 'absolute', bottom: 16, right: 18, fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>-1.2</div>
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>0</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.inkSub, letterSpacing: 2, fontFamily: T.mono }}>קצב שבועי</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              {pace !== null ? (
                <>
                  <span style={{ fontFamily: T.mono, fontSize: 48, fontWeight: 700, color: pace < 0 ? T.lime : pace > 0 ? T.rose : T.inkMute, letterSpacing: -2, lineHeight: 1 }}>
                    {fmt.signed(pace)}
                  </span>
                  <span style={{ fontSize: 14, color: T.inkSub, fontWeight: 600 }}>{unit === 'lb' ? 'ליב׳/שב׳' : 'ק״ג/שב׳'}</span>
                </>
              ) : (
                <span style={{ fontFamily: T.mono, fontSize: 30, color: T.inkMute, fontWeight: 600 }}>אין נתונים</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.inkMute, marginTop: 4, fontFamily: T.mono }}>
              {pace === null ? 'צריך לפחות 2 שקילות במרחק של ימים' : pace < -0.05 ? 'יורד' : pace > 0.05 ? 'עולה' : 'יציב'}
            </div>
          </div>
        </div>

        {/* Current weight strip */}
        <Card padding={14} style={{ marginBottom: 12, background: T.bgElev2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: T.inkMute, letterSpacing: 1, fontFamily: T.mono }}>עכשיו</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <span style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 600, letterSpacing: -1.5 }}>{fmt.kg(stats.current, unit)}</span>
                <span style={{ fontSize: 14, color: T.inkSub }}>{fmt.unitLabel(unit)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <Sparkline data={stats.list.slice(-14)} width={110} height={40} stroke={T.lime} />
              <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginTop: 2 }}>14 ימים אחרונים</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.stroke}` }}>
            {[
              { label: 'יום',   val: stats.dayDelta },
              { label: 'שבוע',  val: stats.deltaWeek },
              { label: 'חודש', val: stats.deltaMonth },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{m.label}</div>
                <div style={{ marginTop: 2 }}><DeltaBadge value={m.val} unit={fmt.unitLabel(unit)} size="sm" /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* ETA */}
        {stats.etaDays !== null && goal !== null && (
          <Card padding={0} style={{ marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 2 }}>זמן הגעה משוער</div>
              <Pill color={T.lime} size="sm">בקצב</Pill>
            </div>
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: T.mono, fontSize: 44, fontWeight: 700, color: T.lime, letterSpacing: -2, lineHeight: 1 }}>{stats.etaDays}</span>
                <span style={{ fontSize: 14, color: T.inkSub }}>ימים</span>
              </div>
              <div style={{ fontSize: 11, color: T.inkMute, marginTop: 2, fontFamily: T.mono }}>~{Math.round(stats.etaDays/7)} שבועות · להגעה ליעד {fmt.kg(goal, unit)}</div>
            </div>
            <div style={{ position: 'relative', height: 44, margin: '0 16px 14px', background: T.bgElev2, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                <div style={{ flex: stats.progressPct || 0, background: `linear-gradient(90deg, ${T.amber}55, ${T.lime}55)`, borderLeft: `2px solid ${T.lime}` }} />
                <div style={{ flex: 100 - (stats.progressPct || 0) }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: 10, fontFamily: T.mono, color: T.inkSub }}>
                <span>{fmt.kg(stats.startWeight, unit)}</span>
                <span style={{ color: T.ink, fontWeight: 700 }}>→ {fmt.kg(stats.current, unit)} ←</span>
                <span>{fmt.kg(goal, unit)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Peak/Low */}
        {stats.n >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Card padding={12}>
              <div style={{ fontSize: 10, color: T.rose, fontFamily: T.mono, letterSpacing: 1 }}>שיא ▲</div>
              <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, letterSpacing: -1, marginTop: 6 }}>{fmt.kg(stats.peak.weight, unit)}</div>
              <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2 }}>{fmt.day(stats.peak.date)}</div>
            </Card>
            <Card padding={12}>
              <div style={{ fontSize: 10, color: T.lime, fontFamily: T.mono, letterSpacing: 1 }}>שפל ▼</div>
              <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, letterSpacing: -1, marginTop: 6 }}>{fmt.kg(stats.low.weight, unit)}</div>
              <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2 }}>{fmt.day(stats.low.date)}</div>
            </Card>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// V3 — Journey (vertical milestones) — fixed to handle gain-over-start
// ════════════════════════════════════════════════════════════════════
function HomeV3({ onNavigate }) {
  const { state, stats } = useStore();
  const unit = state.settings.unit;
  const goal = state.goal.weight;
  const startWeight = stats.startWeight;

  if (stats.empty) {
    return (
      <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
        <HomeHeader onNavigate={onNavigate} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <EmptyState icon="🗺️" title="התחל את המסע" message="הוסף שקילה ראשונה כדי לראות את המפה."
            action={<Button onClick={() => onNavigate('log')}>הוסף שקילה</Button>} />
        </div>
      </div>
    );
  }

  const curW = stats.current;
  // Fix: extend range to include all milestones including above-start excursions
  const topW = Math.max(startWeight, stats.peak.weight, curW) + 1;
  const botW = goal !== null ? Math.min(goal, stats.low.weight, curW) - 1 : Math.min(stats.low.weight, curW) - 1;
  const range = topW - botW;
  const posFor = (w) => ((topW - w) / range) * 100;

  const pct = goal !== null && startWeight !== goal
    ? Math.max(0, Math.min(1, (startWeight - curW) / (startWeight - goal)))
    : 0;

  const milestones = [
    { w: startWeight, label: 'נקודת זינוק', date: state.user.startDate, kind: 'start' },
    stats.peak.weight > startWeight + 0.2 && { w: stats.peak.weight, label: 'שיא · חריגה למעלה', date: stats.peak.date, kind: 'peak' },
    stats.low.weight < startWeight - 1 && { w: stats.low.weight, label: 'שפל · השיא הכי נמוך', date: stats.low.date, kind: 'low' },
    goal !== null && { w: goal, label: 'היעד', kind: 'goal' },
  ].filter(Boolean).sort((a, b) => b.w - a.w);

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1.5 }}>המסע שלך</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            יום {stats.streak} · {fmt.kg(Math.abs(startWeight - curW), unit)} ק״ג {startWeight > curW ? 'מאחורה' : 'מעל ההתחלה'}
          </div>
        </div>
        <WorkoutStreakBadge onNavigate={onNavigate} />
        <AvatarDot letter={(state.user.name || 'U')[0]} size={32} />
      </div>
      <DayBanner />
      <MonthlyRecapButton onNavigate={onNavigate} />

      <div style={{ padding: '6px 18px 10px' }}>
        <Card padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>מיקום נוכחי</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 700, letterSpacing: -1.5 }}>{fmt.kg(curW, unit)}</span>
              <span style={{ fontSize: 13, color: T.inkSub }}>{fmt.unitLabel(unit)}</span>
              <DeltaBadge value={stats.dayDelta} unit="" size="sm" />
            </div>
          </div>
          {goal !== null && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.lime }}>{Math.round(pct * 100)}%</div>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>של המסע</div>
            </div>
          )}
        </Card>
      </div>

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 20px', position: 'relative' }}
      >
        <div style={{ position: 'relative', minHeight: 480 }}>
          <div style={{
            position: 'absolute', top: 10, bottom: 10, right: 32, width: 3,
            background: `linear-gradient(180deg, ${T.rose} 0%, ${T.amber} 40%, ${T.lime} 100%)`,
            borderRadius: 3, opacity: 0.35,
          }} />

          {milestones.map((m, i) => {
            const top = posFor(m.w);
            const passed = curW <= m.w && m.kind !== 'start';
            const colorMap = { start: T.rose, peak: T.rose, low: T.lime, goal: T.amber };
            const color = colorMap[m.kind] || T.inkMute;
            return (
              <div key={i} style={{
                position: 'absolute', top: `${top}%`, right: 0, left: 0,
                display: 'flex', alignItems: 'center', gap: 10,
                transform: 'translateY(-50%)',
              }}>
                <div style={{ flex: 1, textAlign: 'left', paddingLeft: 4 }}>
                  <div style={{ fontSize: 11, color: T.inkSub }}>{m.label}</div>
                  {m.date && <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, marginTop: 1 }}>{fmt.day(m.date)}</div>}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color, minWidth: 42, textAlign: 'center' }}>
                  {fmt.kg(m.w, unit)}
                </div>
                <div style={{
                  width: m.kind === 'goal' || m.kind === 'start' ? 22 : 14,
                  height: m.kind === 'goal' || m.kind === 'start' ? 22 : 14,
                  borderRadius: '50%',
                  background: passed || m.kind === 'start' ? color : T.bgElev,
                  border: `2px solid ${color}`,
                  marginRight: 26 - (m.kind === 'goal' || m.kind === 'start' ? 4 : 0),
                  boxShadow: passed ? `0 0 12px ${color}80` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: T.bg,
                }}>
                  {m.kind === 'goal' && '★'}
                </div>
              </div>
            );
          })}

          {/* You-are-here marker */}
          <div style={{
            position: 'absolute', top: `${posFor(curW)}%`, right: 8, left: 0,
            transform: 'translateY(-50%)', zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
          }}>
            <div style={{
              background: T.lime, color: T.bg, padding: '6px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 800, fontFamily: T.font, position: 'relative',
              boxShadow: `0 4px 20px ${T.lime}66`,
            }}>
              אתה כאן · {fmt.kg(curW, unit)}
              <div style={{
                position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
                width: 10, height: 10, background: T.lime,
              }} />
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: T.lime, border: `4px solid ${T.bg}`, boxShadow: `0 0 24px ${T.lime}`, marginRight: 18 }} />
          </div>
        </div>

        {stats.etaDays !== null && goal !== null && (
          <Card padding={14} style={{ marginTop: 16, background: `${T.lime}10`, border: `1px solid ${T.lime}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.inkSub }}>בקצב הנוכחי תגיע ליעד בעוד</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.lime }}>{stats.etaDays}</span>
                  <span style={{ fontSize: 13, color: T.ink }}>ימים</span>
                  {stats.paceKgPerWeek !== null && <span style={{ fontSize: 11, color: T.inkMute, marginRight: 8 }}>· קצב {fmt.signed(stats.paceKgPerWeek)}ק״ג/שב׳</span>}
                </div>
              </div>
            </div>
          </Card>
        )}
      </PullToRefresh>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Nutrition mini-widget for home
// ════════════════════════════════════════════════════════════════════
function NutritionWidget({ onNavigate }) {
  const { state, stats } = useStore();
  const goals = state.nutrition.goals;
  const today = todayISO();
  const meals = state.nutrition.meals[today] || [];
  const totals = sumMealsForDay(meals);

  // If no nutrition set up, offer CTA
  if (goals.calories === null) {
    return (
      <Card padding={14} style={{ marginBottom: 14, background: `${T.lime}08`, border: `1px solid ${T.lime}30`, cursor: 'pointer' }}
        onClick={() => onNavigate('nutrition')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🍎</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>הוסף מעקב תזונה</div>
            <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2 }}>ניתוח חכם מטקסט או תמונה</div>
          </div>
          <span style={{ color: T.lime, fontSize: 18 }}>‹</span>
        </div>
      </Card>
    );
  }

  const calPct = Math.min(100, (totals.calories / goals.calories) * 100);
  const calColor = totals.calories > goals.calories * 1.05 ? T.rose : T.lime;
  const remaining = goals.calories - totals.calories;
  const proteinPct = goals.protein ? Math.min(100, (totals.protein / goals.protein) * 100) : 0;

  return (
    <Card padding={14} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => onNavigate('nutrition')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>תזונה · היום</div>
        <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
          {totals.count} ארוחות
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <RingGauge pct={calPct} size={72} stroke={8} color={calColor} track={T.stroke}>
          <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: -0.5 }}>
            {totals.calories}
          </div>
          <div style={{ fontSize: 8, color: T.inkMute, fontFamily: T.mono }}>/{goals.calories}</div>
        </RingGauge>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: -1 }}>
            {remaining >= 0 ? remaining : 0}
          </div>
          <div style={{ fontSize: 11, color: T.inkSub }}>
            {remaining > 0 ? 'קלוריות נותרו' : remaining < -50 ? `חריגה ${Math.abs(remaining)}` : 'סגרת את היום'}
          </div>
          {/* Protein bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginBottom: 3 }}>
              <span>חלבון</span>
              <span>{totals.protein}/{goals.protein}ג</span>
            </div>
            <div style={{ height: 4, background: T.stroke, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${proteinPct}%`, height: '100%', background: T.lime, transition: 'width 300ms' }} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// E4 — Monthly recap
// ════════════════════════════════════════════════════════════════════
//
// Visible-on-Home button + full-screen dialog showing the previous
// calendar month's stats. Auto-suppressed once per month (state
// dismissedMonthlyRecap). Archive list lives in Profile.
//
// Conditions for the Home button to appear:
//   - today.day <= 7 (first week of new month)
//   - dismissedMonthlyRecap !== prevMonth (user hasn't acknowledged it)
//   - >= 5 weight entries in prevMonth (enough to be worth a recap)

const HEBREW_MONTH_NAMES = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

// "YYYY-MM" — the previous calendar month, regardless of today's day.
function previousMonthYM(todayIso) {
  const [y, m] = todayIso.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-12; -2 makes it month-1 zero-indexed
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// "YYYY-MM" → "אפריל 2026"
function monthDisplayName(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${HEBREW_MONTH_NAMES[m - 1]} ${y}`;
}

// All YYYY-MM keys that have at least one entry, sorted desc.
function monthsWithData(state) {
  const months = new Set();
  Object.keys(state.entries || {}).forEach(d => months.add(d.slice(0, 7)));
  Object.keys(state.workouts?.sessions || {}).forEach(d => months.add(d.slice(0, 7)));
  Object.keys(state.nutrition?.meals || {}).forEach(d => months.add(d.slice(0, 7)));
  return Array.from(months).sort().reverse();
}

// Compute the home-button gate. Returns the prevMonth YM if the button
// should appear, or null otherwise.
function shouldShowMonthlyRecap(state) {
  const today = todayISO();
  const day = parseInt(today.split('-')[2], 10);
  if (day > 7) return null;

  const prevMonth = previousMonthYM(today);
  if (state.settings.dismissedMonthlyRecap === prevMonth) return null;

  const entriesInMonth = Object.keys(state.entries || {})
    .filter(d => d.startsWith(prevMonth + '-'));
  if (entriesInMonth.length < 5) return null;

  return prevMonth;
}

// Compute hard stats for any month (used by both the recap dialog and AI).
function computeMonthStats(state, ym) {
  const prefix = ym + '-';
  // Weights
  const entries = Object.entries(state.entries || {})
    .filter(([d]) => d.startsWith(prefix))
    .map(([d, e]) => ({ date: d, weight: e.weight, time: e.time, note: e.note || '' }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Workouts
  const workouts = [];
  Object.entries(state.workouts?.sessions || {}).forEach(([d, list]) => {
    if (d.startsWith(prefix)) (list || []).forEach(w => workouts.push({ ...w, _date: d }));
  });

  // Nutrition (sums per day for context)
  const nutritionDays = Object.keys(state.nutrition?.meals || {}).filter(d => d.startsWith(prefix));

  // Streak: longest consecutive-day weight streak inside this month
  let longestStreak = 0;
  if (entries.length > 0) {
    let cur = 1;
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1].date;
      const curr = entries[i].date;
      const gap = daysBetweenISO(prev, curr);
      if (gap === 1) {
        cur += 1;
      } else {
        if (cur > longestStreak) longestStreak = cur;
        cur = 1;
      }
    }
    if (cur > longestStreak) longestStreak = cur;
  }

  const weights = entries.map(e => e.weight);
  const avgWeight = weights.length ? weights.reduce((s, w) => s + w, 0) / weights.length : null;
  const deltaWeight = (weights.length >= 2)
    ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10
    : null;

  // Holidays inside the month (E3 helper)
  const monthStart = ym + '-01';
  const [y, m] = ym.split('-').map(Number);
  const lastDayObj = new Date(y, m, 0); // m is 1-based, day 0 of next = last of this
  const monthEnd = `${ym}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
  const holidays = (typeof holidaysInRange === 'function')
    ? holidaysInRange(monthStart, monthEnd) : [];

  return {
    ym, monthName: monthDisplayName(ym),
    period: { from: monthStart, to: monthEnd },
    entries_count: entries.length,
    weight_entries: entries,
    avg_weight: avgWeight !== null ? Math.round(avgWeight * 10) / 10 : null,
    delta_weight: deltaWeight,
    workouts_count: workouts.length,
    workouts_minutes_total: workouts.reduce((s, w) => s + (w.durationMin || 0), 0),
    nutrition_days_logged: nutritionDays.length,
    longest_streak: longestStreak,
    goal_target_kg: state.goal?.weight || null,
    holidays,
  };
}

// Quick deterministic achievements (shown if AI isn't available).
function computeAutoAchievements(stats) {
  const out = [];
  if (stats.longest_streak >= 7) {
    out.push(`רצף שקילה של ${stats.longest_streak} ימים — עקביות אמיתית.`);
  } else if (stats.longest_streak >= 3) {
    out.push(`רצף שקילה של ${stats.longest_streak} ימים.`);
  }
  if (stats.delta_weight !== null && stats.delta_weight < -0.3) {
    out.push(`ירידה של ${Math.abs(stats.delta_weight).toFixed(1)} ק״ג בחודש.`);
  } else if (stats.delta_weight !== null && Math.abs(stats.delta_weight) <= 0.3) {
    out.push(`שמירה על משקל יציב — בתוך 0.3 ק״ג.`);
  }
  if (stats.workouts_count >= 8) {
    out.push(`${stats.workouts_count} אימונים נרשמו (~${Math.round(stats.workouts_count / 4)} בשבוע).`);
  } else if (stats.workouts_count > 0) {
    out.push(`${stats.workouts_count} אימונים נרשמו.`);
  }
  if (stats.entries_count >= 20) {
    out.push(`${stats.entries_count} ימי שקילה בחודש.`);
  }
  return out.slice(0, 3);
}

// ─── Home: button that opens the recap dialog ──────────────────────
function MonthlyRecapButton({ onNavigate }) {
  const { state } = useStore();
  const [open, setOpen] = React.useState(false);
  const ym = shouldShowMonthlyRecap(state);
  if (!ym) return null;

  const monthLabel = HEBREW_MONTH_NAMES[parseInt(ym.split('-')[1], 10) - 1];
  const buttonText = personaStr(state, 'monthly_recap_button',
    `📅 סיכום חודש ${monthLabel}`,
    { MONTH: monthLabel }
  );

  return (
    <>
      <div style={{ padding: '6px 18px 0' }}>
        <button onClick={() => setOpen(true)} style={{
          width: '100%', padding: '12px 14px',
          background: `linear-gradient(135deg, ${T.cyan}25 0%, ${T.lime}15 100%)`,
          border: `1px solid ${T.cyan}55`, borderRadius: 10,
          color: T.ink, fontSize: 13, fontWeight: 700, fontFamily: T.font,
          cursor: 'pointer', textAlign: 'right', direction: 'rtl',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span>{buttonText}</span>
          <span style={{ fontSize: 18, color: T.cyan }}>›</span>
        </button>
      </div>

      {open && <MonthlyRecapDialog
        ym={ym}
        onClose={() => setOpen(false)}
        canDismiss={true}
      />}
    </>
  );
}

// ─── Recap dialog (full-screen) ─────────────────────────────────────
// canDismiss=true → "סיים" button writes dismissedMonthlyRecap.
// canDismiss=false → archive view, only "סגור" (no state change).
function MonthlyRecapDialog({ ym, onClose, canDismiss }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const monthStats = React.useMemo(() => computeMonthStats(state, ym), [state, ym]);
  const autoAchievements = React.useMemo(() => computeAutoAchievements(monthStats), [monthStats]);

  const [aiResult, setAiResult] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiTried, setAiTried] = React.useState(false);

  // Try AI once on open if API is ready and we have enough data
  React.useEffect(() => {
    if (aiTried) return;
    if (!apiReady(state.apiConfig)) return;
    if (monthStats.entries_count < 5) return;
    setAiTried(true);
    setAiLoading(true);
    generateMonthlyRecap(monthStats, state.apiConfig, (usage) => {
      const cost = estimateCost(usage, state.apiConfig.model);
      dispatch({ type: 'TRACK_USAGE',
        inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
        feature: 'monthly_recap', costUSD: cost,
      });
    }, state)
      .then(r => setAiResult(r))
      .catch(_ => { /* fall back silently to autoAchievements */ })
      .finally(() => setAiLoading(false));
  }, [aiTried, monthStats, state]);

  const finish = () => {
    if (canDismiss) {
      dispatch({ type: 'SET_SETTING', key: 'dismissedMonthlyRecap', value: ym });
    }
    onClose();
  };

  const unit = state.settings.unit;
  const chartData = monthStats.weight_entries.map(e => ({ date: e.date, weight: e.weight }));
  const achievements = (aiResult?.achievements && aiResult.achievements.length > 0)
    ? aiResult.achievements.slice(0, 3)
    : autoAchievements;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 855,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="סגור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>RECAP · סיכום חודשי</div>
          <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📅 {monthStats.monthName}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {/* 4 KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          <RecapKPI label="משקל ממוצע"
            value={monthStats.avg_weight !== null ? fmt.kg(monthStats.avg_weight, unit) : '—'}
            unit={fmt.unitLabel(unit)} />
          <RecapKPI label="שינוי במשקל"
            value={monthStats.delta_weight !== null
              ? (monthStats.delta_weight > 0 ? '+' : '') + monthStats.delta_weight.toFixed(1)
              : '—'}
            unit={fmt.unitLabel(unit)}
            color={monthStats.delta_weight === null ? T.ink :
                   monthStats.delta_weight < 0 ? T.lime :
                   monthStats.delta_weight > 0.3 ? T.rose : T.ink} />
          <RecapKPI label="אימונים"
            value={monthStats.workouts_count}
            sub={monthStats.workouts_minutes_total > 0 ? `${monthStats.workouts_minutes_total} דק׳ סה״כ` : ''} />
          <RecapKPI label="רצף ארוך"
            value={monthStats.longest_streak}
            unit="ימים" color={T.amber} />
        </div>

        {/* Weight chart for the month */}
        {chartData.length >= 2 && (
          <Card padding={12} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              משקל · {chartData.length} מדידות
            </div>
            <WeightChart data={chartData} goal={monthStats.goal_target_kg}
              width={340} height={140} showMarkers={false} showDots={true} />
          </Card>
        )}

        {/* Achievements (AI > auto fallback) */}
        {achievements.length > 0 && (
          <Card padding={14} style={{ marginBottom: 14, background: `${T.lime}10`, border: `1px solid ${T.lime}30` }}>
            <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10 }}>
              ✨ הישגים{aiLoading ? ' (טוען...)' : ''}
            </div>
            {achievements.map((a, i) => (
              <div key={i} style={{
                padding: '8px 12px', background: T.bg, borderRadius: 8, marginBottom: 6,
                fontSize: 13, color: T.ink, lineHeight: 1.5,
                borderRight: `3px solid ${T.lime}`,
              }}>{a}</div>
            ))}
          </Card>
        )}

        {/* AI next-steps */}
        {(aiResult?.next_steps || aiLoading) && (
          <Card padding={14} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.cyan, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              🎯 מה הלאה
            </div>
            {aiLoading && !aiResult ? (
              <SkeletonLines lines={2} />
            ) : (
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                {aiResult.next_steps}
              </div>
            )}
          </Card>
        )}

        {/* Holidays footer (if any) */}
        {monthStats.holidays.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 11, color: T.inkMute, fontFamily: T.mono, textAlign: 'center', lineHeight: 1.6 }}>
            כלל את: {monthStats.holidays.map(h => `${h.emoji} ${h.name}`).join(' · ')}
          </div>
        )}

        {/* Finish CTA */}
        <div style={{ marginTop: 20 }}>
          <Button onClick={finish}>
            {canDismiss ? 'סיים' : 'סגור'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecapKPI({ label, value, unit, sub, color = T.ink }) {
  return (
    <Card padding={14} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 6 }}>
        <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color, letterSpacing: -1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: T.inkMute }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

// ─── Archive list (used from Profile) ──────────────────────────────
// Lists every month with data; clicking opens the recap dialog read-only.
// Mood / energy / sleep tracking removed in v3.6 — low expected utility
// (most users won't fill it; those who do will fill it noisily; AI insights
// from such data tend to be generic). The store reducer cases (SET_MOOD,
// DELETE_MOOD) and loadState merge are kept dormant so existing user data
// in localStorage isn't lost if we revisit the feature later.

function MonthlyArchiveDialog({ onClose }) {
  const { state } = useStore();
  const [openYM, setOpenYM] = React.useState(null);
  const months = React.useMemo(() => monthsWithData(state), [state]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 850,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="סגור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>ARCHIVE · ארכיון</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>📊 סיכומים חודשיים</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {months.length === 0 ? (
          <div style={{ padding: '60px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.6 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>אין עדיין סיכומים</div>
            <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              סיכומים חודשיים יופיעו כאן אחרי שיצטברו לפחות 5 ימי שקילה בחודש.
            </div>
          </div>
        ) : (
          <Col gap={8}>
            {months.map(ym => {
              const stats = computeMonthStats(state, ym);
              const enough = stats.entries_count >= 5;
              return (
                <button key={ym}
                  onClick={() => enough && setOpenYM(ym)}
                  disabled={!enough}
                  style={{
                    padding: '14px 16px', background: T.bgElev,
                    border: `1px solid ${T.stroke}`, borderRadius: 10,
                    color: T.ink, fontSize: 14, cursor: enough ? 'pointer' : 'not-allowed',
                    fontFamily: T.font, textAlign: 'right', direction: 'rtl',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    opacity: enough ? 1 : 0.5,
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{stats.monthName}</div>
                    <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, marginTop: 3 }}>
                      {stats.entries_count} שקילות · {stats.workouts_count} אימונים
                      {stats.delta_weight !== null
                        ? ` · ${stats.delta_weight > 0 ? '+' : ''}${stats.delta_weight.toFixed(1)} ק״ג`
                        : ''}
                    </div>
                  </div>
                  {enough
                    ? <span style={{ color: T.cyan, fontSize: 18 }}>›</span>
                    : <span style={{ fontSize: 10, color: T.inkMute }}>פחות מ-5 שקילות</span>
                  }
                </button>
              );
            })}
          </Col>
        )}
      </div>

      {openYM && <MonthlyRecapDialog ym={openYM} onClose={() => setOpenYM(null)} canDismiss={false} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// F1 — CorrelationsCard (auto-detected patterns, 30d window)
// ════════════════════════════════════════════════════════════════════
//
// Min-data gate: 21 weight days + 14 nutrition days. Below that we show
// a friendly "collect a bit more data" message instead of asking the AI
// to pattern-match noise. Once data is sufficient, the user sees a
// generate button; results are cached in state.insights.correlations
// and shown until the user hits refresh (or 7 days pass — "ישן" hint).

const CORRELATIONS_MIN_WEIGHT_DAYS = 21;
const CORRELATIONS_MIN_NUTRITION_DAYS = 14;

function CorrelationsCard() {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const cached = state.insights?.correlations;
  const hasKey = apiReady(state.apiConfig);

  // Stale = older than 7 days; we still show it but flag it
  const isStale = cached && (Date.now() - new Date(cached.generatedAt).getTime()) > 7 * 24 * 3600 * 1000;

  // Build a 30-day snapshot for the AI. Same shape that other AI calls
  // already use, so the model sees a familiar structure.
  const snapshot = React.useMemo(() => buildInsightSnapshot(state, stats, 30), [state, stats]);
  const weightDays = snapshot.weight_entries_count;
  const nutritionDays = snapshot.nutrition_days_logged;
  const enoughData = weightDays >= CORRELATIONS_MIN_WEIGHT_DAYS
                  && nutritionDays >= CORRELATIONS_MIN_NUTRITION_DAYS;

  const generate = async () => {
    if (!hasKey) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const result = await generateAutoCorrelations(snapshot, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({ type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          feature: 'auto_correlations', costUSD: cost,
        });
      }, state);
      // Tolerate three result shapes: {correlations:[]}, {correlations:[...]}, {insufficient_data:true}
      const items = result?.insufficient_data ? []
                  : Array.isArray(result?.correlations) ? result.correlations
                  : [];
      dispatch({ type: 'SET_INSIGHT', kind: 'correlations',
        payload: { items, generatedAt: new Date().toISOString() },
      });
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const title = personaStr(state, 'correlations_title', '🔍 תבניות שזיהיתי');

  return (
    <Card padding={14} style={{
      marginBottom: 12,
      background: `linear-gradient(135deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${cached ? T.strokeHi : T.stroke}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
            ניתוח 30 ימים אחרונים · {weightDays} שקילות · {nutritionDays} ימי תזונה
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
        <LoadingPersona message="מחפש תבניות בדאטה שלך..." />
      ) : !enoughData ? (
        // Insufficient data — friendly persona-aware message
        <div style={{ padding: '4px 4px 0', fontSize: 12, color: T.inkSub, lineHeight: 1.6 }}>
          {personaStr(state, 'correlations_insufficient',
            `נדרשים ${CORRELATIONS_MIN_WEIGHT_DAYS} ימי שקילה ו-${CORRELATIONS_MIN_NUTRITION_DAYS} ימי תזונה לזיהוי תבניות. יש ${weightDays} ימים.`,
            { DAYS: weightDays, NEED: Math.max(CORRELATIONS_MIN_WEIGHT_DAYS - weightDays, CORRELATIONS_MIN_NUTRITION_DAYS - nutritionDays) }
          )}
        </div>
      ) : cached ? (
        // We have results
        <>
          {cached.items && cached.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cached.items.map((c, i) => (
                <div key={i} style={{
                  padding: '10px 12px', background: T.bg, borderRadius: 8,
                  borderRight: `3px solid ${T.lime}`,
                }}>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: 4 }}>
                    {c.pattern}
                  </div>
                  {c.support && (
                    <div style={{ fontSize: 10, color: T.lime, fontFamily: T.mono, marginBottom: 6 }}>
                      תמיכה: {c.support}
                    </div>
                  )}
                  {c.action && (
                    <div style={{ fontSize: 11, color: T.inkSub, fontStyle: 'italic', lineHeight: 1.5 }}>
                      💡 {c.action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 4px', fontSize: 12, color: T.inkMute, lineHeight: 1.6 }}>
              לא נמצאו תבניות עם תמיכה מספיקה (60%+) בדאטה הנוכחית.
              נסה שוב אחרי שיצטברו עוד שבוע-שבועיים של דאטה.
            </div>
          )}
          <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, marginTop: 10, textAlign: 'left', direction: 'ltr' }}>
            {fmt.relativeDay(cached.generatedAt.slice(0, 10))} · {isStale ? 'ישן' : 'עדכני'}
          </div>
        </>
      ) : (
        // First-time generate
        <>
          <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginBottom: 12 }}>
            יש מספיק דאטה. ה-AI יחפש תבניות חבויות (משהו ספציפי, לא "תאכל פחות").
          </div>
          <button onClick={generate} disabled={!hasKey} style={{
            background: hasKey ? T.lime : T.bgElev2, color: hasKey ? T.bg : T.inkMute,
            border: 'none', padding: '10px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, fontFamily: T.font,
            cursor: hasKey ? 'pointer' : 'not-allowed', width: '100%',
          }}>
            {hasKey ? 'מצא תבניות' : 'הגדר API בפרופיל'}
          </button>
        </>
      )}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// F2 — WhatIfCard (forward projection from a hypothetical change)
// ════════════════════════════════════════════════════════════════════
//
// 3 preset scenarios + a custom text input. Each query is a one-off (not
// cached) — projections are cheap and the user often wants to compare a
// few back-to-back. Min-data gate: 14 weight days (need a real pace to
// project from).
//
// The "result" panel shows just the most recent answer; previous answers
// aren't kept. Keeps the surface focused on the current question.

const WHAT_IF_MIN_WEIGHT_DAYS = 14;
const WHAT_IF_PRESETS = [
  'מה אם אוסיף אימון אחד בשבוע?',
  'מה אם אקטין ב-200 ק״ק ביום?',
  'מה אם אשמור על הקצב הנוכחי?',
];

function WhatIfCard() {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null); // { summary, details, scenario }
  const [customMode, setCustomMode] = React.useState(false);
  const [customText, setCustomText] = React.useState('');
  const hasKey = apiReady(state.apiConfig);

  const snapshot = React.useMemo(() => buildInsightSnapshot(state, stats, 30), [state, stats]);
  const weightDays = snapshot.weight_entries_count;
  const enoughData = weightDays >= WHAT_IF_MIN_WEIGHT_DAYS;

  const ask = async (scenarioText) => {
    if (!hasKey) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const r = await generateWhatIf(snapshot, scenarioText, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({ type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          feature: 'what_if', costUSD: cost,
        });
      }, state);
      setResult({ ...r, scenario: scenarioText });
      setCustomMode(false);
      setCustomText('');
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const title = personaStr(state, 'what_if_title', '🎯 מה אם...');

  return (
    <Card padding={14} style={{
      marginBottom: 14,
      background: `linear-gradient(135deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${T.stroke}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
            תחזית מבוססת קצב הנוכחי שלך
          </div>
        </div>
      </div>

      {!enoughData ? (
        <div style={{ padding: '4px 4px 0', fontSize: 12, color: T.inkSub, lineHeight: 1.6 }}>
          נדרשים {WHAT_IF_MIN_WEIGHT_DAYS} ימי שקילה לתחזית. יש {weightDays}.
        </div>
      ) : loading ? (
        <LoadingPersona message="מחשב תחזית..." />
      ) : (
        <>
          {/* Preset buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {WHAT_IF_PRESETS.map((p, i) => (
              <button key={i} onClick={() => ask(p)} disabled={!hasKey} style={{
                width: '100%', padding: '10px 12px',
                background: T.bg, border: `1px solid ${T.stroke}`, borderRadius: 8,
                color: T.ink, fontSize: 12, fontFamily: T.font, cursor: hasKey ? 'pointer' : 'not-allowed',
                textAlign: 'right', direction: 'rtl',
                opacity: hasKey ? 1 : 0.5,
              }}>{p}</button>
            ))}
            {customMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <input
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="למשל: מה אם אעלה ל-3 אימונים בשבוע?"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                    background: T.bg, border: `1px solid ${T.stroke}`, borderRadius: 8,
                    color: T.ink, fontSize: 12, fontFamily: T.font, outline: 'none',
                    direction: 'rtl', textAlign: 'right',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setCustomMode(false); setCustomText(''); }} style={{
                    flex: 1, padding: 8, background: 'transparent', border: `1px solid ${T.stroke}`,
                    borderRadius: 8, color: T.inkSub, fontSize: 12, cursor: 'pointer', fontFamily: T.font,
                  }}>ביטול</button>
                  <button onClick={() => ask(customText)} disabled={!customText.trim()} style={{
                    flex: 2, padding: 8,
                    background: customText.trim() ? T.lime : T.bgElev2,
                    color: customText.trim() ? T.bg : T.inkMute,
                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: customText.trim() ? 'pointer' : 'not-allowed', fontFamily: T.font,
                  }}>שאל</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCustomMode(true)} disabled={!hasKey} style={{
                width: '100%', padding: '8px 12px', marginTop: 2,
                background: 'transparent', border: `1px dashed ${T.stroke}`, borderRadius: 8,
                color: T.inkMute, fontSize: 11, fontFamily: T.font, cursor: hasKey ? 'pointer' : 'not-allowed',
                textAlign: 'center', opacity: hasKey ? 1 : 0.5,
              }}>+ שאלה מותאמת</button>
            )}
          </div>

          {!hasKey && (
            <div style={{ marginTop: 10, fontSize: 11, color: T.amber, lineHeight: 1.5, textAlign: 'center' }}>
              ⚠️ הגדר API בפרופיל לקבלת תחזיות
            </div>
          )}

          {/* Latest result */}
          {result && (
            <div style={{
              marginTop: 12, padding: 12, background: T.bg, borderRadius: 8,
              borderRight: `3px solid ${T.cyan}`,
            }}>
              <div style={{ fontSize: 10, color: T.cyan, fontFamily: T.mono, marginBottom: 6 }}>
                {result.scenario}
              </div>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, fontWeight: 600 }}>
                {result.summary || 'אין תחזית'}
              </div>
              {result.details && (
                <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, marginTop: 6 }}>
                  {result.details}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
