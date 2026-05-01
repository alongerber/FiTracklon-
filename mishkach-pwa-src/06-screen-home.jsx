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
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: T.inkMute }}>{greet}</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div>
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
          <WeightChart data={chartData} goal={goal} width={320} height={160} />
        </Card>

        {/* Nutrition mini widget */}
        <NutritionWidget onNavigate={onNavigate} />

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
        <div style={{ flex: 1, fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>MISHKACH · VELOCITY</div>
        <WorkoutStreakBadge onNavigate={onNavigate} />
        <StreakBadge days={stats.streak} />
        <AvatarDot letter={(state.user.name || 'U')[0]} size={28} />
      </div>

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
            <div style={{ fontSize: 10, color: T.inkSub, letterSpacing: 2, fontFamily: T.mono }}>VELOCITY · קצב שבועי</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              {pace !== null ? (
                <>
                  <span style={{ fontFamily: T.mono, fontSize: 48, fontWeight: 700, color: pace < 0 ? T.lime : pace > 0 ? T.rose : T.inkMute, letterSpacing: -2, lineHeight: 1 }}>
                    {fmt.signed(pace)}
                  </span>
                  <span style={{ fontSize: 14, color: T.inkSub, fontWeight: 600 }}>{unit === 'lb' ? 'lb/w' : 'ק״ג/שב׳'}</span>
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
              <div style={{ fontSize: 10, color: T.inkMute, letterSpacing: 1, fontFamily: T.mono }}>NOW</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <span style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 600, letterSpacing: -1.5 }}>{fmt.kg(stats.current, unit)}</span>
                <span style={{ fontSize: 14, color: T.inkSub }}>{fmt.unitLabel(unit)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <Sparkline data={stats.list.slice(-14)} width={110} height={40} stroke={T.lime} />
              <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginTop: 2 }}>14 DAYS</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.stroke}` }}>
            {[
              { label: 'Δ DAY',   val: stats.dayDelta },
              { label: 'Δ WEEK',  val: stats.deltaWeek },
              { label: 'Δ MONTH', val: stats.deltaMonth },
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
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 2 }}>ETA · ESTIMATED ARRIVAL</div>
              <Pill color={T.lime} size="sm">מסלול פעיל</Pill>
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
              <div style={{ fontSize: 10, color: T.rose, fontFamily: T.mono, letterSpacing: 1 }}>PEAK · שיא ▲</div>
              <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, letterSpacing: -1, marginTop: 6 }}>{fmt.kg(stats.peak.weight, unit)}</div>
              <div style={{ fontSize: 10, color: T.inkMute, marginTop: 2 }}>{fmt.day(stats.peak.date)}</div>
            </Card>
            <Card padding={12}>
              <div style={{ fontSize: 10, color: T.lime, fontFamily: T.mono, letterSpacing: 1 }}>LOW · שפל ▼</div>
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
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1.5 }}>THE JOURNEY · המסע שלך</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            יום {stats.streak} · {fmt.kg(Math.abs(startWeight - curW), unit)} ק״ג {startWeight > curW ? 'מאחורה' : 'מעל ההתחלה'}
          </div>
        </div>
        <WorkoutStreakBadge onNavigate={onNavigate} />
        <AvatarDot letter={(state.user.name || 'U')[0]} size={32} />
      </div>

      <div style={{ padding: '6px 18px 10px' }}>
        <Card padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>CURRENT POSITION</div>
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
