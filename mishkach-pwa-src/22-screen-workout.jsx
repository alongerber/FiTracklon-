// ════════════════════════════════════════════════════════════════════
// 22-screen-workout.jsx — Workout main screen + dialogs
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// Stage H (v3.19) — questionnaire option catalog
// ════════════════════════════════════════════════════════════════════
// Each entry is { value: <stored in plan_settings>, label: <Hebrew chip> }.
// The same value strings are sent to the AI prompt builder — keep them
// in sync with EXPERIENCE_LABELS_HE / LOCATION_LABELS_HE / etc. in
// 20-ai-prompts.jsx.
const PLAN_QUESTION_EXPERIENCE = [
  { value: 'beginner',   label: 'לא התאמנתי שנים, מתחיל מאפס' },
  { value: 'occasional', label: 'מתאמן מדי פעם, אבל לא קבוע' },
  { value: 'regular',    label: 'מתאמן באופן קבוע (פעם בשבוע+)' },
  { value: 'serious',    label: 'מתאמן רציני, יש לי ניסיון' },
];
const PLAN_QUESTION_LOCATION = [
  { value: 'home_no_equipment', label: 'בבית, בלי ציוד' },
  { value: 'home_weights',      label: 'בבית, יש לי משקולות' },
  { value: 'gym',               label: 'חדר כושר' },
  { value: 'flexible',          label: 'גמיש — גם וגם' },
];
const PLAN_QUESTION_DURATION = [
  { value: 15, label: '15-20 דקות' },
  { value: 30, label: '30 דקות' },
  { value: 45, label: '45 דקות' },
  { value: 60, label: 'שעה+' },
];
const PLAN_QUESTION_FREQUENCY = [
  { value: 2, label: '2 פעמים' },
  { value: 3, label: '3 פעמים' },
  { value: 4, label: '4 פעמים' },
  { value: 5, label: '5+ פעמים' },
];
const PLAN_QUESTION_GOAL = [
  { value: 'lose_weight', label: 'לרדת במשקל' },
  { value: 'strength',    label: 'להיות חזק יותר' },
  { value: 'aesthetics',  label: 'להיראות יותר טוב' },
  { value: 'energy',      label: 'להרגיש יותר אנרגטי' },
];
const PLAN_QUESTION_LIMITATIONS = [
  // limitations is multi-select; "none" exclusivity enforced in the UI.
  { value: 'back',      label: 'בעיות גב' },
  { value: 'knees',     label: 'בעיות ברכיים' },
  { value: 'shoulders', label: 'בעיות כתפיים' },
  { value: 'none',      label: 'אין שום מגבלה' },
  { value: 'other',     label: 'משהו אחר' },
];

// ════════════════════════════════════════════════════════════════════
// WorkoutOnboardingScreen — questionnaire → AI plan generation
// ════════════════════════════════════════════════════════════════════
// Single scroll page (no multi-step wizard) so the user can review their
// answers before submitting. The "צור תוכנית" CTA is sticky at the bottom
// and disabled until all required fields have an answer.
//
// On submit:
//   1. Save plan_settings (so a regenerate later picks them up).
//   2. Show loading state ("בונה תוכנית — 30-60 שניות").
//   3. Call generateWorkoutPlan (Opus); on success, dispatch SET_WORKOUT_PLAN
//      and close. On failure, show the error inline so the user can retry.
function WorkoutOnboardingScreen({ onClose, onPlanReady }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();

  // Pre-fill from existing plan_settings (regenerate flow)
  const existing = state.workouts?.plan_settings || {};
  const [experience, setExperience] = React.useState(existing.experience || null);
  const [location,   setLocation]   = React.useState(existing.location   || null);
  const [duration,   setDuration]   = React.useState(existing.duration   || null);
  const [frequency,  setFrequency]  = React.useState(existing.frequency  || null);
  const [goal,       setGoal]       = React.useState(existing.goal       || null);
  const [limitations, setLimitations] = React.useState(existing.limitations || []);
  const [customLimit, setCustomLimit] = React.useState(existing.custom_limitation || '');

  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState(null);

  const hasAI = apiReady(state.apiConfig);
  // All single-select required; limitations defaults empty (== "אין"-equivalent if not set)
  const allAnswered = !!(experience && location && duration && frequency && goal);

  const toggleLimitation = (val) => {
    setLimitations(prev => {
      // "none" is exclusive — picking it clears the rest, picking another clears "none"
      if (val === 'none') {
        return prev.includes('none') ? [] : ['none'];
      }
      const without = prev.filter(v => v !== 'none' && v !== val);
      return prev.includes(val) ? without : [...without, val];
    });
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    if (!hasAI) {
      toast('הגדר API בפרופיל', { type: 'error' });
      return;
    }
    setError(null);
    setGenerating(true);

    const settings = {
      experience, location, duration, frequency, goal,
      limitations: limitations.length > 0 ? limitations : ['none'],
      custom_limitation: limitations.includes('other') ? (customLimit.trim() || null) : null,
    };
    dispatch({ type: 'SET_PLAN_SETTINGS', settings });

    try {
      const plan = await generateWorkoutPlan(
        settings,
        stats?.current,
        state.apiConfig,
        (usage) => {
          const cost = estimateCost(usage, state.apiConfig.model);
          dispatch({
            type: 'TRACK_USAGE',
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            feature: 'workout_plan',
            costUSD: cost,
          });
        },
        state,
      );
      dispatch({ type: 'SET_WORKOUT_PLAN', plan });
      // Plausible — analytics for the planning flow
      try { trackEvent && trackEvent('Workout Plan Generated', { frequency: settings.frequency, location: settings.location }); } catch (_) {}
      toast(personaStr(state, 'workout_plan_ready', 'התוכנית מוכנה'), { type: 'success' });
      onPlanReady && onPlanReady();
    } catch (e) {
      setError(e.message || 'שגיאה ביצירת התוכנית');
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 870,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="סגור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          תוכנית אימונים מותאמת
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px' }}>
        <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 22 }}>
          6 שאלות. ה-AI יבנה לך תוכנית 7 ימים מותאמת — חימום, תרגילים, מנוחות, מתיחות.
        </div>

        <PlanQuestion title="רמת ניסיון">
          <ChipColumn options={PLAN_QUESTION_EXPERIENCE} value={experience} onPick={setExperience} />
        </PlanQuestion>

        <PlanQuestion title="איפה תתאמנו">
          <ChipColumn options={PLAN_QUESTION_LOCATION} value={location} onPick={setLocation} />
        </PlanQuestion>

        <PlanQuestion title="כמה זמן יש לכם לכל אימון">
          <ChipColumn options={PLAN_QUESTION_DURATION} value={duration} onPick={setDuration} columns={2} />
        </PlanQuestion>

        <PlanQuestion title="כמה פעמים בשבוע">
          <ChipColumn options={PLAN_QUESTION_FREQUENCY} value={frequency} onPick={setFrequency} columns={2} />
        </PlanQuestion>

        <PlanQuestion title="מה הכי חשוב">
          <ChipColumn options={PLAN_QUESTION_GOAL} value={goal} onPick={setGoal} />
        </PlanQuestion>

        <PlanQuestion title="מגבלות (אפשר לבחור כמה)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PLAN_QUESTION_LIMITATIONS.map(opt => (
              <button key={opt.value}
                onClick={() => toggleLimitation(opt.value)}
                style={chipStyle(limitations.includes(opt.value))}>
                {opt.label}
              </button>
            ))}
          </div>
          {limitations.includes('other') && (
            <input
              value={customLimit}
              onChange={e => setCustomLimit(e.target.value)}
              placeholder="פירוט המגבלה (לא חובה)"
              style={{
                width: '100%', marginTop: 10, padding: '10px 14px',
                background: T.bgElev, border: `1px solid ${T.stroke}`,
                borderRadius: 10, color: T.ink, fontSize: 13,
                fontFamily: T.font, outline: 'none', direction: 'rtl', textAlign: 'right',
              }}
            />
          )}
        </PlanQuestion>

        {error && (
          <div style={{
            padding: '10px 14px', marginTop: 4,
            background: `${T.rose}15`, border: `1px solid ${T.rose}44`,
            borderRadius: 10, fontSize: 12, color: T.rose, lineHeight: 1.5,
          }}>{error}</div>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{
        padding: '12px 18px',
        borderTop: `1px solid ${T.stroke}`, background: T.bg,
      }}>
        <button onClick={handleSubmit}
          disabled={!allAnswered || generating}
          style={{
            width: '100%', height: 56,
            background: (allAnswered && !generating) ? T.lime : T.bgElev2,
            color: (allAnswered && !generating) ? T.bg : T.inkMute,
            border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 800, fontFamily: T.font,
            cursor: (allAnswered && !generating) ? 'pointer' : 'not-allowed',
          }}>
          {generating ? 'בונה תוכנית — 30-60 שניות…' : 'צור תוכנית'}
        </button>
        {!hasAI && (
          <div style={{ fontSize: 11, color: T.amber, textAlign: 'center', marginTop: 8 }}>
            דורש חיבור AI. הגדר בפרופיל → API.
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers for the questionnaire
function PlanQuestion({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ChipColumn({ options, value, onPick, columns = 1 }) {
  // Single-select chip list. `value` matches one of the options' `value`.
  // columns=1 → vertical stack; columns=2 → 2-up grid.
  return (
    <div style={{
      display: columns > 1 ? 'grid' : 'flex',
      flexDirection: 'column',
      gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
      gap: 8,
    }}>
      {options.map(opt => (
        <button key={String(opt.value)}
          onClick={() => onPick(opt.value)}
          style={chipStyle(value === opt.value)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function chipStyle(active) {
  return {
    width: '100%', minHeight: 48, padding: '10px 14px',
    border: `1.5px solid ${active ? T.lime : T.stroke}`,
    background: active ? T.lime : T.bgElev,
    color: active ? T.bg : T.ink,
    fontSize: 13, fontWeight: active ? 800 : 600,
    fontFamily: T.font, cursor: 'pointer',
    borderRadius: 12, textAlign: 'right', direction: 'rtl',
  };
}

// ════════════════════════════════════════════════════════════════════
// v3.21 — Audio + duration helpers for the rest timer
// ════════════════════════════════════════════════════════════════════
// One module-scoped AudioContext, lazily created on first beep so we
// don't hit the iOS "AudioContext requires user gesture" gotcha during
// React mount. Shared across all rest timers in a session.
let _wktAudioCtx = null;
function _getWktAudio() {
  if (_wktAudioCtx) return _wktAudioCtx;
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try { _wktAudioCtx = new Ctx(); return _wktAudioCtx; }
  catch (_) { return null; }
}

// v3.23.2 fix #6: prime the AudioContext during a known user gesture
// (e.g. when the user taps "התחל אימון"). On iOS, an AudioContext created
// outside a gesture starts in 'suspended' and resume() is async — the
// first beep used to fire its oscillators BEFORE resume completed and was
// therefore inaudible. Calling this once during the start gesture unlocks
// the context (silent zero-volume tone) so all subsequent beeps work.
function primeWktAudio() {
  try {
    const ctx = _getWktAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Schedule a 1ms zero-volume tone to fully unlock the audio graph on iOS.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.frequency.value = 440;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.001);
  } catch (_) { /* swallow */ }
}

async function playRestEndBeep() {
  // Two short 880Hz beeps — clear "rest is over" cue without being shrill.
  // If audio is blocked (page hidden, no user gesture yet), we silently no-op.
  // v3.23.2 fix #6: AWAIT ctx.resume() before scheduling oscillators. The
  // previous fire-and-forget pattern caused the first beep to be silent
  // on iOS when the context was still 'suspended'.
  try {
    const ctx = _getWktAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) { /* fall through anyway */ }
    }
    const now = ctx.currentTime;
    [0, 0.18].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch (_) { /* swallow */ }
  // Best-effort haptic on supporting devices (mostly Android Chrome)
  try { if (navigator.vibrate) navigator.vibrate([180, 60, 180]); } catch (_) {}
}

// Format an mm:ss elapsed timer
function _fmtMmSs(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// Compute the duration in minutes between an ISO timestamp and now.
function _durationMinSince(isoStart) {
  if (!isoStart) return 0;
  const ms = Date.now() - new Date(isoStart).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

// Estimate kcal burned for a session — cheap proxy: ~6 kcal/min for moderate
// strength, ~8 kcal/min for cardio/quick. Real numbers depend on body mass +
// HR but the user just needs a useful magnitude.
function _estimateKcal(workout, durationMin) {
  if (!durationMin || durationMin <= 0) return 0;
  const isCardio = (workout?.exercises || []).some(ex =>
    /הליכה|ריצה|אופניים|ארובי|קפיצה|חבל/.test(ex.name || '')
  );
  const ratePerMin = isCardio ? 8 : 6;
  return Math.round(durationMin * ratePerMin);
}

// ════════════════════════════════════════════════════════════════════
// ActiveWorkoutScreen — live workout flow (Stage H part 2)
// ════════════════════════════════════════════════════════════════════
// State machine: warmup → exercise[i].set[j] → rest → exercise[i].set[j+1]
//   → exercise[i+1] → ... → cooldown → completion → save & dismiss.
//
// All transitions go through dispatch (PATCH_ACTIVE_SESSION / COMPLETE_SET
// / SKIP_SECTION) so a mid-session app close can resume from
// state.workouts.activeSession on next App boot.
//
// Mode "quick": starts at exercise (skips warmup); after the last set,
// asks "להוסיף מתיחות?" before the completion summary.
function ActiveWorkoutScreen({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const session = state.workouts?.activeSession;
  const plan = state.workouts?.plan;
  // Resolve the workout from the plan by ID. If the user wiped the plan
  // mid-session somehow, abandon gracefully.
  const workout = React.useMemo(() => {
    if (!session || !plan) return null;
    return (plan.workouts || []).find(w => w.id === session.workoutId) || null;
  }, [session?.workoutId, plan]);

  if (!session) { onClose && onClose(); return null; }
  if (!workout) {
    return (
      <ActiveScreenShell onClose={() => { dispatch({ type: 'ABANDON_ACTIVE_WORKOUT' }); onClose && onClose(); }}>
        <div style={{ padding: 32, textAlign: 'center', color: T.inkSub }}>
          האימון של הסשן הפעיל לא נמצא בתוכנית. נסגור את הסשן.
        </div>
      </ActiveScreenShell>
    );
  }

  const exerciseCount = (workout.exercises || []).length;

  // ─── Section transitions ─────────────────────────────────────────
  // Hide a section if it was skipped at start (quick mode) OR mid-flow.
  const skipped = (sec) => (session.skippedSections || []).includes(sec);

  const goToExercises = () => {
    dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: {
      currentSection: 'exercise',
      currentExerciseIdx: 0,
      currentSetIdx: 0,
    }});
  };

  const onWarmupDone = () => goToExercises();
  const onWarmupSkip = () => {
    dispatch({ type: 'SKIP_SECTION', section: 'warmup' });
    trackEvent('Workout Section Skipped', { section: 'warmup' });
    goToExercises();
  };

  // v3.23.2 fix #1: advance-lock + signature debounce.
  // Two dispatches (COMPLETE_SET + PATCH_ACTIVE_SESSION) read currentSetIdx /
  // currentExerciseIdx from the closure of the previous render. A double-tap
  // (~80ms) on "סיימתי הסט" before re-render would trigger advanceAfterSet
  // twice with the same closure → set duplicated/skipped or progress lost.
  // Fix: lock keyed by the section-position signature; the lock is cleared
  // automatically when the underlying state actually advances (the next time
  // advanceAfterSet is called with a NEW signature).
  const advanceLockRef = React.useRef({ key: null, until: 0 });
  // After completing a set, decide if it's the last set, the last exercise,
  // or just the next set. Emits dispatches to advance the session.
  const advanceAfterSet = (recordedReps, recordedWeight, viaSkip = false) => {
    const sig = `${session.currentExerciseIdx}:${session.currentSetIdx}:${session.currentSection}`;
    const now = Date.now();
    const lock = advanceLockRef.current;
    // Drop the call if either: (a) same signature within 200ms (debounce
    // double-tap before re-render), or (b) same signature already advanced
    // and the closure hasn't refreshed yet.
    if (lock.key === sig && now < lock.until) return;
    advanceLockRef.current = { key: sig, until: now + 200 };

    const ex = workout.exercises[session.currentExerciseIdx];
    if (!viaSkip) {
      dispatch({
        type: 'COMPLETE_SET',
        exerciseId: ex.id,
        setIdx: session.currentSetIdx,
        reps: recordedReps,
        weight: recordedWeight,
      });
    }

    const isLastSet = session.currentSetIdx + 1 >= (ex.sets || 1);
    const isLastExercise = session.currentExerciseIdx + 1 >= exerciseCount;

    if (!isLastSet) {
      // Same exercise, next set — go through rest timer first
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: {
        currentSection: 'rest',
        currentSetIdx: session.currentSetIdx + 1,
      }});
      return;
    }
    if (!isLastExercise) {
      // Next exercise, set 0 — also go through a short rest
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: {
        currentSection: 'rest',
        currentExerciseIdx: session.currentExerciseIdx + 1,
        currentSetIdx: 0,
      }});
      return;
    }
    // Done with all exercises — quick mode asks about cooldown,
    // full mode goes straight to cooldown (or completion if skipped).
    if (session.mode === 'quick') {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'cooldown_prompt' } });
    } else if (skipped('cooldown') || !(workout.cooldown || []).length) {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
    } else {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'cooldown' } });
    }
  };

  // The exercise screen passes a "skip exercise" handler too — same as
  // last-set + last-exercise transition checks but without recording.
  const onExerciseSkip = () => {
    const isLastExercise = session.currentExerciseIdx + 1 >= exerciseCount;
    trackEvent('Workout Section Skipped', { section: 'exercise' });
    if (!isLastExercise) {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: {
        currentExerciseIdx: session.currentExerciseIdx + 1,
        currentSetIdx: 0,
        currentSection: 'exercise',
      }});
    } else if (session.mode === 'quick') {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'cooldown_prompt' } });
    } else if (skipped('cooldown') || !(workout.cooldown || []).length) {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
    } else {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'cooldown' } });
    }
  };

  const onRestDone = () => {
    dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'exercise' } });
  };

  const onCooldownDone = () => {
    dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
  };
  const onCooldownSkip = () => {
    dispatch({ type: 'SKIP_SECTION', section: 'cooldown' });
    trackEvent('Workout Section Skipped', { section: 'cooldown' });
    dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
  };

  // Cooldown prompt (quick mode only, after last set)
  const onCooldownPromptYes = () => {
    if ((workout.cooldown || []).length > 0) {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'cooldown' } });
    } else {
      dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
    }
  };
  const onCooldownPromptNo = () => {
    dispatch({ type: 'SKIP_SECTION', section: 'cooldown' });
    dispatch({ type: 'PATCH_ACTIVE_SESSION', patch: { currentSection: 'done' } });
  };

  // Completion → persist + close. Caller passes the feedback rating.
  const finalizeWorkout = (feedbackRating) => {
    const durationMin = _durationMinSince(session.startedAt);
    // Build the saved workout from the completed sets + bonus exercises (v3.22)
    const exByCompleted = {};
    for (const cs of (session.completedSets || [])) {
      if (!exByCompleted[cs.exerciseId]) exByCompleted[cs.exerciseId] = [];
      exByCompleted[cs.exerciseId][cs.setIdx] = {
        reps: cs.reps || 0,
        weight: (cs.weight !== null && cs.weight !== undefined) ? cs.weight : null,
      };
    }
    const exercises = (workout.exercises || []).map(ex => {
      const sets = (exByCompleted[ex.id] || []).filter(Boolean);
      // Dropping skipped sets entirely keeps the saved record honest —
      // history shows what actually happened, not what was planned.
      return {
        id: uid(),
        exerciseId: null,
        name: ex.name,
        muscle: null,
        hasWeight: sets.some(s => s.weight !== null),
        isDuration: false,
        sets: sets.length > 0 ? sets : [],
        notes: '',
      };
    }).filter(ex => ex.sets.length > 0);

    // v3.22: append bonus exercises to the saved workout. Each bonus is
    // one set; we tag with isBonus so the WorkoutHistory rendering can
    // surface them visually if it wants to.
    const bonusExercises = (session.bonusExercises || []).map(b => ({
      id: uid(),
      exerciseId: null,
      name: b.name,
      muscle: null,
      hasWeight: b.weight !== null && b.weight > 0,
      isDuration: false,
      isBonus: true,
      sets: [{ reps: b.reps || 0, weight: (b.weight !== null && b.weight !== undefined) ? b.weight : null }],
      notes: '',
    }));

    const savedWorkout = {
      time: nowHHMM(),
      name: workout.name || 'אימון מתוכנן',
      type: 'strength',
      durationMin,
      notes: '',
      exercises: [...exercises, ...bonusExercises],
      planRef: { workoutId: workout.id, planGeneratedAt: plan?.generated_at || null },
    };
    dispatch({
      type: 'COMPLETE_ACTIVE_WORKOUT',
      date: session.date,
      durationMin,
      feedback: feedbackRating,
      workout: savedWorkout,
    });
    trackEvent('Active Workout Completed', {
      mode: session.mode,
      duration_min: durationMin,
      feedback: feedbackRating,
    });
    toast(personaStr(state, 'workout_saved', 'האימון נשמר. כל הכבוד.'), { type: 'success' });
    onClose && onClose();
  };

  const abandon = () => {
    dispatch({ type: 'ABANDON_ACTIVE_WORKOUT' });
    trackEvent('Active Workout Abandoned', { mode: session.mode });
    onClose && onClose();
  };

  // ─── Render the active section ───────────────────────────────────
  let body;
  if (session.currentSection === 'warmup') {
    body = <ActiveWarmup
      items={workout.warmup || []}
      onDone={onWarmupDone}
      onSkip={onWarmupSkip}
    />;
  } else if (session.currentSection === 'exercise') {
    const ex = workout.exercises[session.currentExerciseIdx];
    body = <ActiveExerciseSet
      exercise={ex}
      exerciseIdx={session.currentExerciseIdx}
      exerciseCount={exerciseCount}
      setIdx={session.currentSetIdx}
      onComplete={(reps, weight) => advanceAfterSet(reps, weight, false)}
      onSkipSet={() => {
        trackEvent('Workout Section Skipped', { section: 'set' });
        advanceAfterSet(0, null, true);
      }}
      onSkipExercise={onExerciseSkip}
    />;
  } else if (session.currentSection === 'rest') {
    const prevExIdx = session.currentSetIdx === 0
      ? Math.max(0, session.currentExerciseIdx - 1)
      : session.currentExerciseIdx;
    const restSec = workout.exercises[prevExIdx]?.rest_seconds || 60;
    body = <ActiveRestTimer
      seconds={restSec}
      onDone={onRestDone}
      onSkip={onRestDone}
    />;
  } else if (session.currentSection === 'cooldown_prompt') {
    body = <ActiveCooldownPrompt onYes={onCooldownPromptYes} onNo={onCooldownPromptNo} />;
  } else if (session.currentSection === 'cooldown') {
    body = <ActiveCooldown
      items={workout.cooldown || []}
      onDone={onCooldownDone}
      onSkip={onCooldownSkip}
    />;
  } else if (session.currentSection === 'done') {
    body = <ActiveCompletion
      session={session}
      workout={workout}
      onSave={finalizeWorkout}
    />;
  }

  return <ActiveScreenShell onClose={abandon}>{body}</ActiveScreenShell>;
}

// ─── Shell ──────────────────────────────────────────────────────────
function ActiveScreenShell({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 880,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="עצור אימון" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          אימון פעיל
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

// ─── Section: warmup ───────────────────────────────────────────────
// Continuous timer (mm:ss) — there's no per-item count; the user just
// works through the warmup list at their own pace. "סיימתי" advances.
function ActiveWarmup({ items, onDone, onSkip }) {
  // v3.23.2 fix #2: hooks must always be called at the top level. The
  // previous useEffect-inside-`if (empty)` branch violated React rules and
  // would crash with "Rendered more hooks than during the previous render"
  // when `items` switched from empty → non-empty between renders.
  const isEmpty = !items || items.length === 0;
  const [elapsed, setElapsed] = React.useState(0);
  // Capture latest onDone so the auto-advance effect doesn't re-fire when
  // the parent re-renders and hands us a new closure.
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    if (isEmpty) {
      onDoneRef.current && onDoneRef.current();
      return;
    }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isEmpty]);

  if (isEmpty) return null;
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: T.cyan, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>חימום</div>
      <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 800, color: T.cyan, letterSpacing: -1, marginBottom: 18 }}>
        {_fmtMmSs(elapsed)}
      </div>
      <Card padding={14} style={{ marginBottom: 18 }}>
        {items.map((w, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i === items.length - 1 ? 'none' : `1px solid ${T.stroke}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{w.name}</div>
              {w.duration ? <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>{w.duration}ש׳</div> : null}
            </div>
            {w.instruction && (
              <div style={{ fontSize: 12, color: T.inkSub, marginTop: 4, lineHeight: 1.5 }}>{w.instruction}</div>
            )}
          </div>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onSkip}>דלג חימום</Button>
        <Button onClick={onDone}>סיימתי</Button>
      </div>
    </div>
  );
}

// ─── Section: exercise + set ───────────────────────────────────────
function ActiveExerciseSet({ exercise, exerciseIdx, exerciseCount, setIdx, onComplete, onSkipSet, onSkipExercise }) {
  // v3.22: bonus exercise modal — opened by the small button under the
  // skip controls. Modal handles ADD_BONUS_EXERCISE itself; this screen
  // just toggles visibility.
  const [bonusOpen, setBonusOpen] = React.useState(false);
  // Default reps from the planned "reps" string — accept "8-12" → 10, "12" → 12.
  const defaultReps = React.useMemo(() => {
    const s = String(exercise?.reps || '').trim();
    const range = s.match(/(\d+)\s*-\s*(\d+)/);
    if (range) return Math.round((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2);
    const single = s.match(/(\d+)/);
    return single ? parseInt(single[1], 10) : 10;
  }, [exercise?.reps]);
  const showWeight = !!(exercise?.equipment && exercise.equipment !== 'none');

  const [reps, setReps] = React.useState(defaultReps);
  const [weight, setWeight] = React.useState(0);

  // Reset per-set
  React.useEffect(() => {
    setReps(defaultReps);
    setWeight(0);
  }, [exerciseIdx, setIdx, defaultReps]);

  const totalSets = exercise?.sets || 1;
  const progress = Math.round(((exerciseIdx + (setIdx + 1) / totalSets) / Math.max(1, exerciseCount)) * 100);

  return (
    <div style={{ padding: 24 }}>
      {/* Progress header */}
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>
        תרגיל {exerciseIdx + 1} מתוך {exerciseCount} · {progress}%
      </div>
      <div style={{ height: 4, background: T.stroke, borderRadius: 2, overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ width: `${progress}%`, height: '100%', background: T.lime, transition: 'width 200ms' }} />
      </div>

      {/* Exercise name */}
      <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, lineHeight: 1.2, marginBottom: 8, letterSpacing: -0.5 }}>
        {exercise?.name || 'תרגיל'}
      </div>
      {exercise?.instruction && (
        <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 14 }}>
          {exercise.instruction}
        </div>
      )}

      {/* Set indicator */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: T.lime, fontFamily: T.mono,
        letterSpacing: 1, marginBottom: 10,
      }}>סט {setIdx + 1} מתוך {totalSets}</div>

      {/* Reps + weight controls */}
      <Card padding={16} style={{ marginBottom: 12 }}>
        <ActiveCounterRow label="חזרות" value={reps} unit=""
          step={1} min={0} max={500} onChange={setReps} />
        {showWeight && (
          <ActiveCounterRow label="משקל" value={weight} unit="ק״ג"
            step={2.5} min={0} max={300} onChange={setWeight}
            valueFmt={(v) => v === 0 ? 'גוף' : v.toString()}
            extraPad
          />
        )}
      </Card>

      {/* Tip */}
      {exercise?.tip && (
        <div style={{
          padding: '8px 12px', borderRight: `2px solid ${T.amber}`,
          background: `${T.amber}10`, fontSize: 11, color: T.inkSub, lineHeight: 1.5,
          marginBottom: 18,
        }}>
          <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
            <TabIcon name="lightbulb" size={11} />
          </span>
          {exercise.tip}
        </div>
      )}

      {/* Action buttons — primary save + skip variants */}
      <button onClick={() => onComplete(reps, showWeight ? weight : null)} style={{
        width: '100%', height: 56,
        background: T.lime, color: T.bg, border: 'none', borderRadius: 14,
        fontSize: 16, fontWeight: 800, fontFamily: T.font, cursor: 'pointer',
        marginBottom: 10,
      }}>
        סיימתי הסט
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSkipSet} style={skipBtnStyle}>דלג סט</button>
        <button onClick={onSkipExercise} style={skipBtnStyle}>דלג תרגיל</button>
      </div>

      {/* v3.22: bonus exercise — small + button at the bottom */}
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <button onClick={() => setBonusOpen(true)} style={{
          background: 'transparent', border: 'none',
          color: T.amber, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer', padding: '6px 12px',
        }}>
          + תרגיל בונוס
        </button>
      </div>

      {bonusOpen && <BonusExerciseDialog onClose={() => setBonusOpen(false)} />}
    </div>
  );
}

const skipBtnStyle = {
  flex: 1, height: 44, background: 'transparent',
  border: `1px solid ${T.stroke}`, borderRadius: 12,
  color: T.inkSub, fontSize: 12, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer',
};

function ActiveCounterRow({ label, value, unit, step, min, max, onChange, valueFmt, extraPad }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: extraPad ? 12 : 0, paddingBottom: 4, borderTop: extraPad ? `1px solid ${T.stroke}` : 'none' }}>
      <div style={{ flex: 1, fontSize: 13, color: T.inkSub, fontWeight: 600 }}>{label}</div>
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
        disabled={value <= min}
        style={counterBtn(value <= min)}>−</button>
      <div style={{
        minWidth: 80, padding: '8px 12px', textAlign: 'center',
        background: T.bgElev2, borderRadius: 10,
        fontFamily: T.mono, fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.5,
      }}>{valueFmt ? valueFmt(value) : value}{unit && value !== 0 ? ' ' + unit : ''}</div>
      <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
        disabled={value >= max}
        style={counterBtn(value >= max)}>+</button>
    </div>
  );
}

function counterBtn(disabled) {
  return {
    width: 44, height: 44, borderRadius: 12,
    background: T.bgElev, border: `1px solid ${T.stroke}`,
    color: disabled ? T.inkMute : T.ink,
    fontSize: 22, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', flexShrink: 0,
  };
}

// ─── Section: rest timer ────────────────────────────────────────────
function ActiveRestTimer({ seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = React.useState(seconds);
  const beepedRef = React.useRef(false);
  // v3.23.2 fix #3: guard against double-fire of onDone. Without this, a
  // tap on "דלג" within the 800ms window between remaining=0 and the
  // setTimeout would call onDone twice → PATCH_ACTIVE_SESSION runs twice
  // on stale closures, corrupting currentSetIdx/currentExerciseIdx.
  const doneCalledRef = React.useRef(false);

  const safeDone = React.useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    onDone && onDone();
  }, [onDone]);
  const safeSkip = React.useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    onSkip && onSkip();
  }, [onSkip]);

  // Interval drives the visible countdown. We call onDone via auto-advance
  // when remaining hits 0; the beep also fires once at that moment.
  React.useEffect(() => {
    if (remaining <= 0) {
      if (!beepedRef.current) { playRestEndBeep(); beepedRef.current = true; }
      const t = setTimeout(() => safeDone(), 800);
      return () => clearTimeout(t);
    }
    const t = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, safeDone]);

  const total = Math.max(seconds, 1);
  const pct = Math.max(0, Math.min(100, (1 - remaining / total) * 100));

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 1, marginBottom: 12 }}>מנוחה</div>

      {/* SVG ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="200" height="200" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke={T.stroke} strokeWidth="6" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={T.lime} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 276.46} 276.46`}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 200ms linear' }}
          />
          <text x="50" y="56" textAnchor="middle" fill={T.ink}
            fontFamily={T.mono} fontSize="20" fontWeight="800">
            {Math.max(0, remaining)}
          </text>
          <text x="50" y="68" textAnchor="middle" fill={T.inkMute}
            fontFamily={T.mono} fontSize="6" letterSpacing="1">שניות</text>
        </svg>
      </div>

      <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 18 }}>
        {remaining > 0 ? 'תנשום, תשתה מים' : 'בוא נמשיך'}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={() => setRemaining(r => r + 30)}>+30 שניות</Button>
        <Button onClick={safeSkip}>דלג</Button>
      </div>
    </div>
  );
}

// ─── Section: cooldown prompt (quick mode only) ────────────────────
function ActiveCooldownPrompt({ onYes, onNo }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>סיימת את התרגילים</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: 14 }}>
        להוסיף מתיחות?
      </div>
      <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 22 }}>
        2-3 דקות מתיחה אחרי אימון מהיר עוזרות להחלים מהר יותר.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onNo}>לא, סיימתי</Button>
        <Button onClick={onYes}>כן</Button>
      </div>
    </div>
  );
}

// ─── Section: cooldown ─────────────────────────────────────────────
function ActiveCooldown({ items, onDone, onSkip }) {
  // v3.23.2 fix #2: same hook-violation fix as ActiveWarmup. See above.
  const isEmpty = !items || items.length === 0;
  const [elapsed, setElapsed] = React.useState(0);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    if (isEmpty) {
      onDoneRef.current && onDoneRef.current();
      return;
    }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isEmpty]);

  if (isEmpty) return null;
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>מתיחות</div>
      <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 800, color: T.amber, letterSpacing: -1, marginBottom: 18 }}>
        {_fmtMmSs(elapsed)}
      </div>
      <Card padding={14} style={{ marginBottom: 18 }}>
        {items.map((c, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i === items.length - 1 ? 'none' : `1px solid ${T.stroke}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.name}</div>
            {c.duration ? <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>{c.duration}ש׳</div> : null}
          </div>
        ))}
      </Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onSkip}>דלג</Button>
        <Button onClick={onDone}>סיימתי</Button>
      </div>
    </div>
  );
}

// ─── Section: completion summary + feedback ────────────────────────
function ActiveCompletion({ session, workout, onSave }) {
  const [feedback, setFeedback] = React.useState(null); // 'easy' | 'right' | 'hard'
  const bonusList = session.bonusExercises || [];
  const totals = React.useMemo(() => {
    const sets = (session.completedSets || []).length;
    const exercisesUsed = new Set((session.completedSets || []).map(s => s.exerciseId)).size;
    const bonusCount = bonusList.length;
    // v3.22: bonus sets count toward totals so the user gets credit for
    // them in the summary stats. Each bonus is treated as one set.
    const totalSets = sets + bonusCount;
    const totalExercises = exercisesUsed + bonusCount;
    const durationMin = _durationMinSince(session.startedAt);
    const kcal = _estimateKcal(workout, durationMin);
    return { sets, exercisesUsed, bonusCount, totalSets, totalExercises, durationMin, kcal };
  }, [session.completedSets, session.startedAt, workout, bonusList.length]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        fontSize: 28, fontWeight: 800, color: T.lime, marginBottom: 6,
        letterSpacing: -0.5,
      }}>כל הכבוד.</div>
      <div style={{ fontSize: 13, color: T.inkSub, marginBottom: 22 }}>
        סיכום האימון:
      </div>

      <Card padding={14} style={{ marginBottom: totals.bonusCount > 0 ? 14 : 22 }}>
        <SummaryRow
          label="תרגילים"
          value={totals.bonusCount > 0
            ? `${totals.exercisesUsed} + ${totals.bonusCount} בונוס`
            : `${totals.exercisesUsed}`}
        />
        <SummaryRow label="סטים" value={`${totals.totalSets}`} />
        <SummaryRow label="משך" value={`${totals.durationMin} דקות`} />
        <SummaryRow label="~ק״ק (משוער)" value={`${totals.kcal}`} isLast />
      </Card>

      {/* v3.22: bonus exercises rendered as a separate amber-tagged list */}
      {totals.bonusCount > 0 && (
        <Card padding={14} style={{
          marginBottom: 22,
          background: `${T.amber}10`, border: `1px solid ${T.amber}40`,
        }}>
          <div style={{
            fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1,
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <TabIcon name="sparkle" size={11} />
            <span>תרגילי בונוס</span>
          </div>
          {bonusList.map((b, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '6px 0',
              borderBottom: i === bonusList.length - 1 ? 'none' : `1px solid ${T.stroke}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{b.name}</div>
              <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono }}>
                {b.reps || 0} חזרות{b.weight ? ` · ${b.weight} ק״ג` : ''}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>איך הרגשת?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[
          { id: 'easy',  label: 'קל'   },
          { id: 'right', label: 'נכון' },
          { id: 'hard',  label: 'קשה'  },
        ].map(f => (
          <button key={f.id} onClick={() => setFeedback(f.id)} style={{
            flex: 1, height: 48, borderRadius: 12,
            background: feedback === f.id ? T.lime : T.bgElev,
            color: feedback === f.id ? T.bg : T.ink,
            border: `1.5px solid ${feedback === f.id ? T.lime : T.stroke}`,
            fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
            cursor: 'pointer',
          }}>{f.label}</button>
        ))}
      </div>

      <Button onClick={() => onSave(feedback)}>שמור</Button>
    </div>
  );
}

function SummaryRow({ label, value, isLast }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '8px 0',
      borderBottom: isLast ? 'none' : `1px solid ${T.stroke}`,
    }}>
      <div style={{ fontSize: 13, color: T.inkSub }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.ink }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ActiveSessionRecoveryDialog — offered at App boot when there's a
// stale activeSession in state. 24h cutoff; older sessions auto-abandon.
// ════════════════════════════════════════════════════════════════════
function ActiveSessionRecoveryDialog({ onResume, onSavePartial, onCancel }) {
  const { state } = useStore();
  const session = state.workouts?.activeSession;
  const plan = state.workouts?.plan;
  if (!session) return null;
  const workout = plan ? (plan.workouts || []).find(w => w.id === session.workoutId) : null;
  // v3.23.2 fix #4 (defense-in-depth): if plan/workout is gone but the
  // mount-effect upstream didn't auto-abandon for some reason, render an
  // orphan-recovery card with a single "Cancel session" button instead of
  // a null that traps the user. The mount effect should handle this case
  // first, but render-path safety prevents future regressions.
  const isOrphan = !plan || !workout;
  const setsCount = (session.completedSets || []).length;
  const minutesAgo = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 990,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 360, width: '100%', direction: 'rtl',
      }}>
        {isOrphan ? (
          <>
            <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              אימון יתום
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: 8 }}>
              היה לך אימון פעיל אבל התוכנית כבר לא קיימת.
            </div>
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 18 }}>
              {setsCount > 0 ? `השלמת ${setsCount} סטים, לפני ${minutesAgo} דקות. ` : ''}
              נסגור את הסשן.
            </div>
            <button onClick={onCancel} style={{
              width: '100%', height: 44, background: T.rose,
              border: 'none', borderRadius: 12,
              color: '#000', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            }}>סגור סשן</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              אימון פעיל
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: 8 }}>
              היית באמצע "{workout?.name || 'אימון'}".
            </div>
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 18 }}>
              {setsCount > 0 ? `השלמת ${setsCount} סטים, לפני ${minutesAgo} דקות.` : `התחלת לפני ${minutesAgo} דקות.`}
              <br />להמשיך מאיפה שעצרת?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button onClick={onResume}>המשך אימון</Button>
              {setsCount > 0 && (
                <Button variant="ghost" onClick={onSavePartial}>סיים ושמור חלקי</Button>
              )}
              <button onClick={onCancel} style={{
                width: '100%', height: 44, background: 'transparent',
                border: `1px solid ${T.rose}55`, borderRadius: 12,
                color: T.rose, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>בטל לגמרי</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// v3.22 — ExerciseEntryPicker (shared by Manual Logging + Bonus modal)
// ════════════════════════════════════════════════════════════════════
// Three input methods → all return the same { name, reps, weight } shape.
// Layout: 3 chips on top, then the active method's body below. Catalog
// path returns immediately on selection (autofills name); voice + text
// paths require the user to fill reps/weight manually after the name lands.
function ExerciseEntryPicker({ initial, onSubmit, onCancel, submitLabel }) {
  // Chosen input method — chip toggles below the inputs
  const [method, setMethod] = React.useState('text'); // 'voice' | 'text' | 'catalog'
  const [name, setName] = React.useState(initial?.name || '');
  const [reps, setReps] = React.useState(initial?.reps || 10);
  const [weight, setWeight] = React.useState(initial?.weight || 0);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [catalogQuery, setCatalogQuery] = React.useState('');

  const filteredCatalog = React.useMemo(() => {
    const list = (typeof EXERCISE_CATALOG !== 'undefined' ? EXERCISE_CATALOG : []);
    if (!catalogQuery.trim()) return list.slice(0, 24); // top 24 by default
    const q = catalogQuery.trim().toLowerCase();
    return list.filter(e => (e.name || '').toLowerCase().includes(q)).slice(0, 24);
  }, [catalogQuery]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      reps: Math.max(0, Math.round(reps || 0)),
      weight: weight > 0 ? +weight : null,
    });
  };

  const methodChip = (id, iconName, label) => (
    <button key={id} onClick={() => setMethod(id)} style={{
      flex: 1, height: 40,
      background: method === id ? T.lime : T.bgElev,
      color: method === id ? T.bg : T.ink,
      border: `1.5px solid ${method === id ? T.lime : T.stroke}`,
      borderRadius: 10, fontSize: 12, fontWeight: 700,
      fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <TabIcon name={iconName} size={14} />
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Method chips */}
      <div style={{ display: 'flex', gap: 8 }}>
        {methodChip('voice', 'microphone', 'דבר')}
        {methodChip('text', 'edit', 'כתיבה')}
        {methodChip('catalog', 'clipboard-list', 'קטלוג')}
      </div>

      {/* Method body — name capture */}
      {method === 'voice' && (
        <div>
          <button onClick={() => setVoiceOpen(true)} style={{
            width: '100%', height: 56,
            background: T.bgElev, color: T.ink,
            border: `1px dashed ${T.stroke}`, borderRadius: 12,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ color: T.lime, display: 'inline-flex' }}>
              <TabIcon name="microphone" size={20} />
            </span>
            <span>לחץ להקלטה</span>
          </button>
          {name && (
            <div style={{ fontSize: 12, color: T.inkSub, marginTop: 6 }}>
              זוהה: <strong style={{ color: T.ink }}>{name}</strong>
            </div>
          )}
        </div>
      )}
      {method === 'text' && (
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="שם התרגיל (למשל: שכיבות סמיכה)"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px',
            background: T.bgElev, border: `1px solid ${T.stroke}`,
            borderRadius: 10, color: T.ink, fontSize: 14,
            fontFamily: 'inherit', outline: 'none',
            direction: 'rtl', textAlign: 'right',
          }}
        />
      )}
      {method === 'catalog' && (
        <div>
          <input
            value={catalogQuery}
            onChange={e => setCatalogQuery(e.target.value)}
            placeholder="חפש בקטלוג…"
            style={{
              width: '100%', padding: '10px 14px', marginBottom: 8,
              background: T.bgElev, border: `1px solid ${T.stroke}`,
              borderRadius: 10, color: T.ink, fontSize: 13,
              fontFamily: 'inherit', outline: 'none',
              direction: 'rtl', textAlign: 'right',
            }}
          />
          <div style={{
            maxHeight: 220, overflowY: 'auto',
            border: `1px solid ${T.stroke}`, borderRadius: 10,
            background: T.bg,
          }}>
            {filteredCatalog.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: T.inkMute }}>
                אין התאמות
              </div>
            ) : filteredCatalog.map(ex => (
              <button key={ex.id} onClick={() => { setName(ex.name); setMethod('text'); }} style={{
                display: 'block', width: '100%',
                padding: '10px 14px', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${T.stroke}`,
                color: T.ink, fontSize: 13, textAlign: 'right', direction: 'rtl',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reps + weight (always visible once name set) */}
      {name && (
        <Card padding={14}>
          <ActiveCounterRow label="חזרות" value={reps} unit=""
            step={1} min={0} max={500} onChange={setReps} />
          <ActiveCounterRow label="משקל" value={weight} unit="ק״ג"
            step={2.5} min={0} max={300} onChange={setWeight}
            valueFmt={(v) => v === 0 ? 'גוף' : v.toString()}
            extraPad
          />
        </Card>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onCancel}>בטל</Button>
        <Button onClick={submit}>{submitLabel || 'הוסף'}</Button>
      </div>

      {/* Voice — reuses existing VoiceInputDialog defined later in this file */}
      {voiceOpen && (
        <VoiceInputDialog
          onClose={() => setVoiceOpen(false)}
          onResult={(parsed, rawText) => {
            // parseWorkoutFromVoice returns { exerciseName, reps, durationSec, weight, ... }
            // We only need name + reps + weight here; durationSec is ignored.
            const got = parsed?.exerciseName || rawText || '';
            if (got) setName(got);
            if (parsed?.reps && parsed.reps > 0) setReps(parsed.reps);
            if (parsed?.weight && parsed.weight > 0) setWeight(parsed.weight);
            setVoiceOpen(false);
            setMethod('text'); // jump to text view so they can review/edit
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ManualLoggingScreen — multi-exercise spontaneous log (v3.22, Task 4)
// ════════════════════════════════════════════════════════════════════
// Replaces the v3.21 wiring of the "תיעוד ידני" button to QuickLog.
// Local state holds the in-progress list; nothing dispatches until Save.
// Cancel mid-flow: discard with no warning if list is empty, confirm
// if the user already added an exercise.
function ManualLoggingScreen({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [items, setItems] = React.useState([]); // [{ id, name, reps, weight }]
  const [showAdd, setShowAdd] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const addItem = (entry) => {
    setItems(arr => [...arr, { id: uid(), ...entry }]);
    setShowAdd(false);
  };
  const removeItem = (id) => setItems(arr => arr.filter(x => x.id !== id));

  const tryClose = () => {
    if (items.length === 0) onClose && onClose();
    else setConfirmCancel(true);
  };

  const save = () => {
    if (items.length === 0) {
      toast('הוסף לפחות תרגיל אחד', { type: 'error' });
      return;
    }
    // Build a single workout record. Spontaneous logs don't get a
    // duration; type='other' marks them as non-strength so the analytics
    // tab counts them under "מעורב". The source field tags the row in
    // WorkoutHistory ("תיעוד ידני" badge — added in v3.22).
    const workout = {
      time: nowHHMM(),
      name: 'תיעוד ידני',
      type: 'other',
      durationMin: 0,
      notes: '',
      source: 'manual_logging',
      exercises: items.map(it => ({
        id: uid(),
        exerciseId: null,
        name: it.name,
        muscle: null,
        hasWeight: it.weight !== null && it.weight > 0,
        isDuration: false,
        sets: [{ reps: it.reps, weight: it.weight }],
        notes: '',
      })),
    };
    dispatch({ type: 'ADD_WORKOUT', date: todayISO(), workout });
    trackEvent('Manual Logging Used', { exercise_count: items.length });
    toast(personaStr(state, 'workout_saved', 'נשמר. כל הכבוד.'), { type: 'success' });
    onClose && onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 875,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={tryClose} aria-label="חזור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          תיעוד ידני
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px' }}>
        <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.6, marginBottom: 18 }}>
          מה עשית? הוסף כל תרגיל בנפרד. בלי טיימרים, בלי חימום — רק רישום.
        </div>

        {items.length === 0 ? (
          <Card padding={20} style={{ textAlign: 'center', border: `1px dashed ${T.stroke}`, background: 'transparent' }}>
            <div style={{ marginBottom: 8, color: T.inkMute, display: 'flex', justifyContent: 'center' }}>
              <TabIcon name="dumbbell" size={32} />
            </div>
            <div style={{ fontSize: 13, color: T.inkSub }}>עוד לא הוספת תרגיל</div>
          </Card>
        ) : (
          <Card padding={0} style={{ marginBottom: 14 }}>
            {items.map((it, i) => (
              <div key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                borderBottom: i === items.length - 1 ? 'none' : `1px solid ${T.stroke}`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3, background: T.lime, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, marginTop: 2 }}>
                    {it.reps} חזרות{it.weight ? ` · ${it.weight} ק״ג` : ''}
                  </div>
                </div>
                <button onClick={() => removeItem(it.id)} aria-label="הסר תרגיל" style={{
                  width: 30, height: 30, borderRadius: 15, background: 'transparent',
                  border: 'none', color: T.inkMute, cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>×</button>
              </div>
            ))}
          </Card>
        )}

        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowAdd(true)} style={{
            width: '100%', padding: 14,
            background: T.bgElev, color: T.ink,
            border: `1.5px dashed ${T.lime}`, borderRadius: 12,
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>+ הוסף תרגיל</button>
        </div>
      </div>

      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${T.stroke}`, background: T.bg,
        display: 'flex', gap: 10,
      }}>
        <Button variant="ghost" onClick={tryClose}>בטל</Button>
        <Button onClick={save} disabled={items.length === 0}>שמור</Button>
      </div>

      {/* Add-exercise modal — uses the shared picker */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 980,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
            padding: 20, maxWidth: 420, width: '100%', direction: 'rtl',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>הוספת תרגיל</div>
            <ExerciseEntryPicker
              onSubmit={addItem}
              onCancel={() => setShowAdd(false)}
              submitLabel="הוסף"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="לבטל את התיעוד?"
        message={`רשמת ${items.length} ${items.length === 1 ? 'תרגיל' : 'תרגילים'}. ביטול ימחק אותם.`}
        confirmLabel="בטל"
        cancelLabel="המשך לרשום"
        danger
        onConfirm={() => { setConfirmCancel(false); onClose && onClose(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// BonusExerciseDialog — modal during ActiveExerciseSet (v3.22, Task 5)
// ════════════════════════════════════════════════════════════════════
// Tap "+ תרגיל בונוס" inside an active workout → this opens. Submit
// dispatches ADD_BONUS_EXERCISE and closes; the user returns to the
// same set they were on. No state machine change — bonus is purely
// additive metadata that surfaces in the completion summary.
function BonusExerciseDialog({ onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const session = state.workouts?.activeSession;

  const submit = (entry) => {
    dispatch({ type: 'ADD_BONUS_EXERCISE', exercise: entry });
    trackEvent('Bonus Exercise Added', { workout_id: session?.workoutId || 'unknown' });
    toast(personaStr(state, 'bonus_added', 'תרגיל בונוס נוסף'), { type: 'success' });
    onClose && onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 985,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.amber}55`,
        padding: 20, maxWidth: 420, width: '100%', direction: 'rtl',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>בונוס</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>הוספת תרגיל בונוס</div>
        <ExerciseEntryPicker
          onSubmit={submit}
          onCancel={onClose}
          submitLabel="הוסף בונוס"
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// v3.23 — Steps tracking UI
// ════════════════════════════════════════════════════════════════════

// One-time onboarding question. Fires on WorkoutScreen mount when
// state.settings.tracksSteps is null. The 'maybe' option is functionally
// the same as 'no' for now — re-prompt logic is a v3.x TODO.
function StepsOnboardingDialog({ onClose, onPick }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 970,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 380, width: '100%', direction: 'rtl',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 14 }}>
          רגע, שאלה אחת.
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: T.ink, marginBottom: 14 }}>
          יש לך/ך דרך לדעת כמה צעדים עשית/ית היום? שעון, אפליקציה אחרת, הרגשה כללית — כל דבר.
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: T.inkSub, marginBottom: 20 }}>
          המידע הזה נותן ערך רק אם תזין/י גם תזונה ומשקל באותם הימים. אחרת זה רעש.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button onClick={() => onPick('yes')}>יש לי דרך</Button>
          <Button variant="ghost" onClick={() => onPick('no')}>לא רלוונטי לי</Button>
          <button onClick={() => onPick('maybe')} style={{
            background: 'transparent', border: 'none',
            color: T.inkMute, fontSize: 12, fontFamily: 'inherit',
            cursor: 'pointer', padding: 10,
          }}>אולי בעתיד</button>
        </div>
      </div>
    </div>
  );
}

// Card on the WorkoutScreen showing today's steps + week aggregate.
// Two layouts: with-data and empty.
function StepsWidget({ stepsToday, steps, onEdit }) {
  const today = todayISO();
  // Compute last-7-day total + average (only days with a count > 0)
  const { weekTotal, weekAvg } = React.useMemo(() => {
    let total = 0, days = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(today, -i);
      const s = steps?.[d];
      if (s && s.count > 0) { total += s.count; days += 1; }
    }
    return {
      weekTotal: total,
      weekAvg: days > 0 ? Math.round(total / days) : 0,
    };
  }, [steps, today]);

  if (!stepsToday) {
    return (
      <Card padding={14} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>
          צעדים היום
        </div>
        <div style={{ fontSize: 13, color: T.inkSub, marginBottom: 12 }}>
          לא תועדו עדיין
        </div>
        <button onClick={onEdit} style={{
          width: '100%', padding: 12,
          background: T.bgElev, color: T.ink,
          border: `1.5px dashed ${T.lime}`, borderRadius: 12,
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <TabIcon name="plus" size={14} />
          <span>הוספה</span>
        </button>
      </Card>
    );
  }

  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
          צעדים היום
        </div>
        <button onClick={onEdit} aria-label="עריכה" style={{
          background: 'transparent', border: `1px solid ${T.stroke}`, borderRadius: 8,
          color: T.inkSub, padding: '4px 10px', fontSize: 11, fontFamily: 'inherit',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <TabIcon name="edit" size={11} />
          <span>עריכה</span>
        </button>
      </div>
      <div style={{
        fontFamily: T.mono, fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: -0.5, marginBottom: 8,
      }}>
        {stepsToday.count.toLocaleString('he-IL')}
      </div>
      {weekTotal > 0 && (
        <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, lineHeight: 1.6 }}>
          השבוע: {weekTotal.toLocaleString('he-IL')}
          <br />
          ממוצע: {weekAvg.toLocaleString('he-IL')}/יום
        </div>
      )}
    </Card>
  );
}

// Single-input dialog — the user types whatever the watch shows.
// No max validation — user knows their own number better than we do.
function StepsLogDialog({ initialCount, onClose, onSave }) {
  const [count, setCount] = React.useState(initialCount || 0);
  // v3.23.2 fix #5: track raw input separately so we can validate properly
  // and surface a visible error. iOS may emit non-digit chars (commas,
  // spaces) when the user pastes a number from a steps app — without
  // sanitization parseInt returned NaN → silent zero → data loss.
  const [raw, setRaw] = React.useState(initialCount ? String(initialCount) : '');
  const [error, setError] = React.useState(null);

  const MAX_STEPS = 200000; // sane upper bound; world record day is ~80k

  const handleChange = (input) => {
    // Strip commas, spaces, RTL marks — anything that isn't a digit.
    const cleaned = String(input).replace(/[^\d]/g, '');
    setRaw(input); // keep what the user typed visible
    if (cleaned === '') {
      setCount(0);
      setError(null);
      return;
    }
    const n = parseInt(cleaned, 10);
    if (Number.isNaN(n)) {
      setCount(0);
      setError('הזן מספר תקין');
      return;
    }
    if (n > MAX_STEPS) {
      setCount(MAX_STEPS);
      setError(`המקסימום הוא ${MAX_STEPS.toLocaleString('he-IL')}`);
      return;
    }
    setCount(n);
    setError(null);
  };

  const handleSave = () => {
    if (count <= 0) {
      setError('הזן מספר חיובי');
      return;
    }
    onSave(count);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 980,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 360, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 18 }}>
          מה השעון אומר?
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={raw}
          onChange={e => handleChange(e.target.value)}
          placeholder="8432"
          style={{
            width: '100%', padding: '14px 16px',
            background: T.bg, border: `1px solid ${error ? T.rose : T.stroke}`,
            borderRadius: 12, color: T.ink,
            fontFamily: T.mono, fontSize: 24, fontWeight: 700,
            textAlign: 'center', outline: 'none',
            marginBottom: error ? 8 : 18,
          }}
        />
        {error && (
          <div style={{
            fontSize: 12, color: T.rose, marginBottom: 14,
            textAlign: 'center', fontFamily: T.mono,
          }}>{error}</div>
        )}
        {!error && count > 0 && (
          <div style={{
            fontSize: 11, color: T.inkMute, marginBottom: 14,
            textAlign: 'center', fontFamily: T.mono,
          }}>נשמר: {count.toLocaleString('he-IL')}</div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} disabled={count <= 0}>שמירה</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PlanWorkoutPreviewDialog — read-only view of a single planned workout
// ════════════════════════════════════════════════════════════════════
// In v3.19 this is the ONLY way to see a generated workout's details
// (warmup → exercises → cooldown). v3.20 will replace the "[התחל אימון]"
// CTA with the live ActiveWorkoutScreen flow.
function PlanWorkoutPreviewDialog({ workout, onClose }) {
  if (!workout) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 875,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="סגור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>אימון מתוך התוכנית</div>
          <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workout.name}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginBottom: 14 }}>
          {workout.duration_estimate} דקות · {workout.exercises?.length || 0} תרגילים
        </div>

        {/* Warmup */}
        {workout.warmup?.length > 0 && (
          <Card padding={14} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.cyan, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TabIcon name="zap" size={11} /><span>חימום</span>
            </div>
            {workout.warmup.map((w, i) => (
              <PlanItemRow key={i}
                title={w.name}
                meta={w.duration ? `${w.duration} שניות` : ''}
                hint={w.instruction}
                isLast={i === workout.warmup.length - 1}
              />
            ))}
          </Card>
        )}

        {/* Exercises */}
        {workout.exercises?.length > 0 && (
          <Card padding={14} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TabIcon name="dumbbell" size={11} /><span>תרגילים</span>
            </div>
            {workout.exercises.map((ex, i) => (
              <div key={ex.id || i} style={{
                padding: '10px 0',
                borderBottom: i === workout.exercises.length - 1 ? 'none' : `1px solid ${T.stroke}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
                    {ex.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.lime, fontFamily: T.mono, fontWeight: 700, flexShrink: 0 }}>
                    {ex.sets}×{ex.reps}
                  </div>
                </div>
                {ex.instruction && (
                  <div style={{ fontSize: 12, color: T.inkSub, marginTop: 4, lineHeight: 1.5 }}>
                    {ex.instruction}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
                  <span>מנוחה {ex.rest_seconds}ש׳</span>
                  {ex.equipment && ex.equipment !== 'none' && <span>· {ex.equipment}</span>}
                </div>
                {ex.tip && (
                  <div style={{
                    marginTop: 6, padding: '6px 10px', borderRight: `2px solid ${T.amber}`,
                    background: `${T.amber}10`, fontSize: 11, color: T.inkSub, lineHeight: 1.5,
                  }}>
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4, color: T.amber }}>
                      <TabIcon name="lightbulb" size={11} />
                    </span>
                    {ex.tip}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Cooldown */}
        {workout.cooldown?.length > 0 && (
          <Card padding={14} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TabIcon name="clock" size={11} /><span>מתיחות / קירור</span>
            </div>
            {workout.cooldown.map((c, i) => (
              <PlanItemRow key={i}
                title={c.name}
                meta={c.duration ? `${c.duration} שניות` : ''}
                isLast={i === workout.cooldown.length - 1}
              />
            ))}
          </Card>
        )}

        {/* v3.21 shipped the live ActiveWorkoutScreen — this dialog is the
            read-only preview ("צפה בפרטי האימון"). Users start the actual
            session from the WorkoutScreen plan card. */}
      </div>
    </div>
  );
}

function PlanItemRow({ title, meta, hint, isLast }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: isLast ? 'none' : `1px solid ${T.stroke}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{title || '—'}</div>
        {meta && <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, flexShrink: 0 }}>{meta}</div>}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: T.inkSub, marginTop: 3, lineHeight: 1.5 }}>{hint}</div>
      )}
    </div>
  );
}

// Map JS Date.getDay() (0=Sun..6=Sat) to the canonical Hebrew day name
// the AI prompt uses in weekly_schedule.
const PLAN_DAY_NAMES_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

// Find today's planned workout from the active plan, if any. Returns
// the full workout object (joined from plan.workouts by workout_id) or
// null when today is a rest day or no plan exists.
function planWorkoutForDate(plan, isoDate) {
  if (!plan || !Array.isArray(plan.weekly_schedule) || !Array.isArray(plan.workouts)) return null;
  const dow = parseDOWFromISO(isoDate); // 0..6 (Sun..Sat) — matches PLAN_DAY_NAMES_HE
  const dayName = PLAN_DAY_NAMES_HE[dow];
  const sched = plan.weekly_schedule.find(s => s.day === dayName);
  if (!sched || !sched.workout_id) return null;
  return plan.workouts.find(w => w.id === sched.workout_id) || null;
}

function WorkoutScreen() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [dateViewing, setDateViewing] = React.useState(todayISO());
  const [newOpen, setNewOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // { workout, date }
  const [showPRs, setShowPRs] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [showRoutines, setShowRoutines] = React.useState(false);
  const [showQuickLog, setShowQuickLog] = React.useState(false);
  const [prefill, setPrefill] = React.useState(null); // { name, type, exercises, routineId? } when opening NewWorkoutDialog from a routine
  // v3.19: AI plan onboarding + read-only preview
  const [showPlanOnboarding, setShowPlanOnboarding] = React.useState(false);
  const [showPlanWorkout, setShowPlanWorkout] = React.useState(null); // workout object
  // v3.21: ActiveWorkoutScreen + recovery dialog
  const [showActive, setShowActive] = React.useState(false);
  const [showRecovery, setShowRecovery] = React.useState(false);
  // v3.22: ManualLoggingScreen replaces the wiring of "תיעוד ידני" → QuickLog
  const [showManualLog, setShowManualLog] = React.useState(false);

  // Recovery — show the dialog once on mount when there's an in-flight
  // session less than 24h old. >24h is treated as abandoned (auto-clear).
  React.useEffect(() => {
    const s = state.workouts?.activeSession;
    if (!s || !s.startedAt) return;
    const ageMs = Date.now() - new Date(s.startedAt).getTime();
    const TWENTY_FOUR_H = 24 * 3600 * 1000;
    if (ageMs > TWENTY_FOUR_H) {
      dispatch({ type: 'ABANDON_ACTIVE_WORKOUT' });
      return;
    }
    // v3.23.2 fix #4: orphan-session guard. If the plan was wiped (or the
    // session's workoutId no longer resolves to a workout in the current
    // plan), the recovery dialog used to render null forever — leaving the
    // user with a ghost activeSession they couldn't dismiss. Auto-abandon.
    const plan = state.workouts?.plan;
    const planMissing = !plan;
    const workoutMissing = !!plan && !(plan.workouts || []).some(w => w.id === s.workoutId);
    if (planMissing || workoutMissing) {
      dispatch({ type: 'ABANDON_ACTIVE_WORKOUT' });
      trackEvent('Active Workout Auto-Abandoned', {
        reason: planMissing ? 'plan_missing' : 'workout_missing',
      });
      return;
    }
    setShowRecovery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPlannedWorkout = (workoutId, mode) => {
    // v3.23.2 fix #6: prime audio inside the user gesture so the first
    // rest-timer beep is audible on iOS PWA (where AudioContext starts
    // suspended and resume() is async).
    primeWktAudio();
    dispatch({ type: 'START_ACTIVE_WORKOUT', workoutId, date: todayISO(), mode });
    trackEvent('Active Workout Started', { mode });
    setShowActive(true);
  };

  // ─── v3.23: Steps tracking ──────────────────────────────────────
  const tracksSteps = state.settings?.tracksSteps;
  const [showStepsOnboarding, setShowStepsOnboarding] = React.useState(false);
  const [showStepsLog, setShowStepsLog] = React.useState(false);
  const stepsToday = state.steps?.[todayISO()];

  // First-time prompt: ask once if user hasn't been asked yet
  React.useEffect(() => {
    if (tracksSteps === null || tracksSteps === undefined) {
      setShowStepsOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reminder toast — fires once when user opens the workout screen
  // after 22:00 with no log today and no reminder shown yet today.
  React.useEffect(() => {
    if (tracksSteps !== 'yes') return;
    const today = todayISO();
    if (stepsToday) return; // already logged
    if (state.context?.lastStepsReminderShown === today) return; // already nudged
    const hour = new Date().getHours();
    if (hour < 22) return; // not late enough
    const text = personaStr(state, 'steps_reminder', 'לא תיעדת צעדים היום.');
    toast(text, {
      type: 'info', duration: 6000,
      actionLabel: 'תיעד',
      onAction: () => setShowStepsLog(true),
    });
    dispatch({ type: 'SET_STEPS_REMINDER_SHOWN', date: today });
    trackEvent('Steps Reminder Shown', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracksSteps]);

  const sessions = state.workouts?.sessions || {};
  const workoutsToday = sessions[dateViewing] || [];
  const streak = workoutStreak(sessions);
  const weekCount = workoutCountLastDays(sessions, 7);
  const weekMinutes = workoutMinutesLastDays(sessions, 7);

  // Analytics — only show charts if there's at least one workout in last 30d
  const monthCount = workoutCountLastDays(sessions, 30);
  const showAnalytics = monthCount > 0;
  const volumeBuckets = React.useMemo(() => weeklyVolumeBuckets(sessions, 4), [sessions]);
  const freqItems = React.useMemo(() => workoutFrequencyByType(sessions, 30), [sessions]);
  const hasAnyVolume = volumeBuckets.some(b => b.volume > 0);

  const headerBtn = {
    width: 34, height: 34, borderRadius: 17, background: T.bgElev,
    border: `1px solid ${T.stroke}`, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, padding: 0, flexShrink: 0,
  };

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>אימון</div>
          <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            אימון · {fmt.relativeDay(dateViewing)}
          </div>
        </div>
        <button onClick={() => setShowSearch(true)} aria-label="חיפוש באימונים" style={{ ...headerBtn, color: T.ink }}>
          <Icon name="search" size={16} />
        </button>
        <button onClick={() => setShowRoutines(true)} aria-label="הרוטינות שלי" style={{ ...headerBtn, color: T.cyan }}>
          <Icon name="clipboard-list" size={16} />
        </button>
        <button onClick={() => setShowPRs(true)} aria-label="שיאים אישיים" style={{ ...headerBtn, color: T.amber }}>
          <Icon name="trophy" size={16} />
        </button>
        {streak >= 2 && (
          <div style={{
            padding: '4px 8px', background: `${T.amber}20`, border: `1px solid ${T.amber}55`,
            borderRadius: 999, fontSize: 10, color: T.amber, fontFamily: T.mono, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}>
            <TabIcon name="flame" size={11} />
            {streak}
          </div>
        )}
      </div>

      {/* Day navigator */}
      <div style={{ padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setDateViewing(d => addDaysISO(d, -1))} style={navBtn}>‹ אתמול</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: T.mono, color: T.inkSub }}>{fmt.day(dateViewing)}</div>
        <button onClick={() => setDateViewing(d => addDaysISO(d, 1))}
          disabled={dateViewing >= todayISO()}
          style={{ ...navBtn, opacity: dateViewing >= todayISO() ? 0.3 : 1 }}>מחר ›</button>
      </div>

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 20px' }}
      >
        {/* v3.19: AI plan card. Either the "create plan" CTA (no plan yet)
            or the active plan summary with today's workout. The full
            ActiveWorkoutScreen lands in v3.20 — for now "התחל אימון"
            opens PlanWorkoutPreviewDialog. */}
        {!state.workouts?.plan ? (
          // v3.21: no plan yet — primary action is manual logging,
          // secondary is the AI plan onboarding CTA.
          <Card padding={18} style={{
            marginBottom: 12,
            background: `linear-gradient(135deg, ${T.lime}15 0%, ${T.bgElev2} 100%)`,
            border: `1px solid ${T.lime}55`,
          }}>
            <ModeEntryButton
              title="תיעוד ידני"
              desc="רושם תרגילים ספונטניים"
              primary
              onClick={() => setShowManualLog(true)}
            />
            <div style={{ fontSize: 11, color: T.inkMute, textAlign: 'center', margin: '12px 0 8px' }}>או</div>
            <ModeEntryButton
              title="צור תוכנית מותאמת"
              desc="שאלון של 6 שאלות, AI בונה תוכנית 7 ימים"
              variant="ghost"
              onClick={() => setShowPlanOnboarding(true)}
            />
          </Card>
        ) : (() => {
          const plan = state.workouts.plan;
          const todayWorkout = planWorkoutForDate(plan, todayISO());
          return (
            <Card padding={14} style={{
              marginBottom: 12,
              background: `linear-gradient(145deg, ${T.bgElev}, ${T.bgElev2})`,
              border: `1px solid ${T.lime}40`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.lime, fontFamily: T.mono, letterSpacing: 1, marginBottom: 2 }}>
                    התוכנית שלך
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {plan.plan_name || 'תוכנית'}
                  </div>
                </div>
                <button onClick={() => setShowPlanOnboarding(true)} style={{
                  background: 'transparent', border: `1px solid ${T.stroke}`,
                  color: T.inkSub, padding: '6px 10px', borderRadius: 8,
                  fontSize: 11, fontFamily: T.mono, cursor: 'pointer', flexShrink: 0,
                }}>עדכן</button>
              </div>

              {todayWorkout ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>היום</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginTop: 2 }}>
                      {todayWorkout.name}
                    </div>
                  </div>

                  {/* v3.21: 3 entry buttons — planned / quick / preview */}
                  <ModeEntryButton
                    primary
                    title="התחל אימון מתוכנן"
                    desc={`${todayWorkout.duration_estimate} דקות · חימום + ${todayWorkout.exercises?.length || 0} תרגילים + מתיחות`}
                    onClick={() => startPlannedWorkout(todayWorkout.id, 'full')}
                  />
                  <ModeEntryButton
                    title="אימון מהיר"
                    desc="רק התרגילים העיקריים, בלי חימום ומתיחות"
                    onClick={() => startPlannedWorkout(todayWorkout.id, 'quick')}
                  />
                  <ModeEntryButton
                    title="תיעוד ידני"
                    desc="רושם תרגיל בודד או רצף ספונטני"
                    variant="ghost"
                    onClick={() => setShowManualLog(true)}
                  />
                  <ModeEntryButton
                    title="צפה בפרטי האימון"
                    desc="ראה את התרגילים לפני שמתחיל"
                    variant="link"
                    onClick={() => setShowPlanWorkout(todayWorkout)}
                  />
                </>
              ) : (
                <>
                  <div style={{
                    padding: '12px 12px', background: T.bgElev, borderRadius: 10,
                    fontSize: 13, color: T.inkSub, lineHeight: 1.6, textAlign: 'center',
                    marginBottom: 12,
                  }}>
                    היום יום מנוחה
                  </div>
                  {/* v3.21: rest day still gets a "view week" affordance */}
                  <ModeEntryButton
                    title="תיעוד ידני"
                    desc="אם החלטת לעשות משהו בכל זאת"
                    primary
                    onClick={() => setShowManualLog(true)}
                  />
                  <ModeEntryButton
                    title="ראה תוכנית השבוע"
                    desc="רשימת האימונים המתוכננים"
                    variant="ghost"
                    onClick={() => {
                      // Find the next non-rest day to show; falls back to first workout
                      const next = (plan.weekly_schedule || []).find(s => s.workout_id);
                      const w = next ? plan.workouts.find(x => x.id === next.workout_id) : null;
                      if (w) setShowPlanWorkout(w);
                    }}
                  />
                </>
              )}
            </Card>
          );
        })()}

        {/* v3.23: Steps widget — only when user opted in */}
        {tracksSteps === 'yes' && (
          <StepsWidget
            stepsToday={stepsToday}
            steps={state.steps}
            onEdit={() => setShowStepsLog(true)}
          />
        )}

        {/* Weekly summary card */}
        <Card padding={14} style={{ marginBottom: 12, background: `linear-gradient(145deg, ${T.bgElev}, ${T.bgElev2})` }}>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
            השבוע האחרון
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.lime, fontFamily: T.mono }}>{weekCount}</div>
              <div style={{ fontSize: 10, color: T.inkSub }}>אימונים</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.amber, fontFamily: T.mono }}>{fmtMinutes(weekMinutes)}</div>
              <div style={{ fontSize: 10, color: T.inkSub }}>סה״כ</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.cyan, fontFamily: T.mono }}>{streak}</div>
              <div style={{ fontSize: 10, color: T.inkSub }}>רצף ימים</div>
            </div>
          </div>
        </Card>

        {/* Analytics — volume + frequency, only if there's any workout in last 30d */}
        {showAnalytics && (
          <Card padding={14} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>נפח שבועי</div>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>4 שב׳ · ק״ג×חזר׳</div>
            </div>
            {hasAnyVolume
              ? <WorkoutVolumeChart buckets={volumeBuckets} />
              : <div style={{ fontSize: 11, color: T.inkMute, padding: '12px 4px', textAlign: 'center' }}>
                  אין נפח לחישוב (אין סטים עם משקל × חזרות)
                </div>
            }

            {freqItems.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.stroke}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>תדירות לפי סוג</div>
                  <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>30 ימים · {monthCount} אימונים</div>
                </div>
                <WorkoutFrequencyChart items={freqItems} />
              </div>
            )}
          </Card>
        )}

        {/* Workouts list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
            אימונים · {workoutsToday.length}
          </div>
          {workoutsToday.length > 0 && (
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>הקש לעריכה</div>
          )}
        </div>

        {workoutsToday.length === 0 ? (
          <Card padding={24} style={{ textAlign: 'center', border: `1px dashed ${T.stroke}`, background: 'transparent' }}>
            <div style={{ marginBottom: 10, color: T.inkMute, display: 'flex', justifyContent: 'center' }}>
              <TabIcon name="dumbbell" size={36} />
            </div>
            <div style={{ fontSize: 13, color: T.inkSub }}>
              עדיין לא נרשם אימון ל{dateViewing === todayISO() ? 'יום' : 'תאריך הזה'}
            </div>
          </Card>
        ) : (
          <Card padding={0}>
            {workoutsToday.map((w, i) => (
              <WorkoutRow key={w.id} workout={w}
                isLast={i === workoutsToday.length - 1}
                onClick={() => setEditing({ workout: w, date: dateViewing })}
              />
            ))}
          </Card>
        )}

        {/* Add buttons — Quick Log (primary, fast) + Full workout (secondary) */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setShowQuickLog(true)} style={{
            width: '100%', padding: 14, background: T.lime, color: T.bg,
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 800, fontFamily: T.font,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 6px 20px ${T.lime}40`,
          }}>
            <Icon name="zap" size={18} /> רישום מהיר
          </button>
          <button onClick={() => setNewOpen(true)} style={{
            width: '100%', padding: 12, background: T.bgElev,
            color: T.ink, border: `1px solid ${T.stroke}`, borderRadius: 12,
            fontSize: 13, fontWeight: 700, fontFamily: T.font,
            cursor: 'pointer',
          }}>+ אימון מורכב (מספר תרגילים)</button>
        </div>
      </PullToRefresh>

      {newOpen && <NewWorkoutDialog
        date={dateViewing}
        prefill={prefill}
        onClose={() => { setNewOpen(false); setPrefill(null); }}
      />}
      {editing && <WorkoutDetailDialog date={editing.date} workout={editing.workout} onClose={() => setEditing(null)} />}
      {showPRs && <PersonalRecordsScreen onClose={() => setShowPRs(false)} />}
      {showSearch && <WorkoutSearchDialog
        onClose={() => setShowSearch(false)}
        onJumpToDate={(d, wid) => { setDateViewing(d); setShowSearch(false); }}
      />}
      {showRoutines && <RoutinesDialog
        onClose={() => setShowRoutines(false)}
        onStartRoutine={(routine) => {
          dispatch({ type: 'TRACK_ROUTINE_USE', routineId: routine.id });
          setPrefill({
            name: routine.name,
            type: routine.type || 'strength',
            duration: routine.durationMin || 30,
            exercises: (routine.exercises || []).map(ex => ({ ...ex, id: uid() })),
            routineId: routine.id,
          });
          setShowRoutines(false);
          setNewOpen(true);
        }}
      />}
      {showQuickLog && <QuickLogDialog onClose={() => setShowQuickLog(false)} />}
      {/* v3.19 — AI plan flows */}
      {showPlanOnboarding && <WorkoutOnboardingScreen
        onClose={() => setShowPlanOnboarding(false)}
        onPlanReady={() => setShowPlanOnboarding(false)}
      />}
      {showPlanWorkout && <PlanWorkoutPreviewDialog
        workout={showPlanWorkout}
        onClose={() => setShowPlanWorkout(null)}
      />}
      {/* v3.21 — active workout flow + recovery */}
      {showActive && <ActiveWorkoutScreen onClose={() => setShowActive(false)} />}
      {/* v3.22 — multi-exercise spontaneous log */}
      {showManualLog && <ManualLoggingScreen onClose={() => setShowManualLog(false)} />}
      {/* v3.23 — Steps tracking */}
      {showStepsOnboarding && <StepsOnboardingDialog
        onClose={() => setShowStepsOnboarding(false)}
        onPick={(value) => {
          dispatch({ type: 'SET_TRACKS_STEPS', value });
          trackEvent('Steps Tracking Enabled', { value });
          setShowStepsOnboarding(false);
        }}
      />}
      {showStepsLog && <StepsLogDialog
        initialCount={stepsToday?.count || 0}
        onClose={() => setShowStepsLog(false)}
        onSave={(count) => {
          dispatch({ type: 'LOG_STEPS', date: todayISO(), count });
          // Bucket for analytics so we don't ship raw numbers
          const bucket = count < 5000 ? '<5k'
            : count < 10000 ? '5-10k'
            : count < 15000 ? '10-15k'
            : '>15k';
          trackEvent('Steps Logged', { count_range: bucket });
          toast(personaStr(state, 'steps_logged_toast', `נרשם: ${count.toLocaleString('he-IL')} צעדים`), { type: 'success' });
          setShowStepsLog(false);
        }}
      />}
      {showRecovery && <ActiveSessionRecoveryDialog
        onResume={() => {
          // v3.23.2 fix #6: prime audio on resume gesture too.
          primeWktAudio();
          setShowRecovery(false);
          setShowActive(true);
        }}
        onSavePartial={() => {
          // Treat partial save as a "complete" with whatever sets exist
          // and no feedback. The user opted out, so don't ask further.
          primeWktAudio();
          setShowRecovery(false);
          setShowActive(true);
          // The user lands on the current section; they tap "סיים" /
          // "דלג" through to completion themselves. (Building an
          // auto-finalize path is risky — they may want to log one more set.)
        }}
        onCancel={() => {
          dispatch({ type: 'ABANDON_ACTIVE_WORKOUT' });
          trackEvent('Active Workout Abandoned', { mode: state.workouts?.activeSession?.mode || 'unknown' });
          setShowRecovery(false);
        }}
      />}
    </div>
  );
}

// ─── v3.21: 3-button row helper used in the WorkoutScreen plan card ──
// `primary`  = lime filled CTA
// `ghost`    = T.bgElev with stroke (default secondary look)
// `link`     = no background, just a row — used for tertiary "preview"
// Each button is a tall 2-line affordance (title + dim desc) so users
// see what each mode does without tapping.
function ModeEntryButton({ title, desc, onClick, primary, variant }) {
  const isPrimary = !!primary;
  const isLink = variant === 'link';
  const isGhost = variant === 'ghost' && !isPrimary;
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: isLink ? '8px 4px' : '12px 14px',
      marginBottom: 8,
      background: isPrimary ? T.lime
                : isLink    ? 'transparent'
                : T.bgElev,
      border: isPrimary ? 'none'
            : isLink    ? 'none'
            : `1px solid ${T.stroke}`,
      borderRadius: isLink ? 0 : 12,
      color: isPrimary ? T.bg : (isLink ? T.lime : T.ink),
      cursor: 'pointer',
      fontFamily: T.font, textAlign: 'right', direction: 'rtl',
      display: 'block',
    }}>
      <div style={{ fontSize: isLink ? 13 : 14, fontWeight: isPrimary ? 800 : 700, lineHeight: 1.3 }}>
        {title}{isLink ? ' ›' : ''}
      </div>
      {desc && !isLink && (
        <div style={{
          fontSize: 11,
          color: isPrimary ? `${T.bg}cc` : T.inkSub,
          marginTop: 3, lineHeight: 1.4, fontWeight: 500,
        }}>{desc}</div>
      )}
    </button>
  );
}

// ─── Workout list row ─────────────────────────────────────────────
function WorkoutRow({ workout, isLast, onClick }) {
  const type = getWorkoutType(workout.type || 'other');
  const exCount = (workout.exercises || []).length;
  return (
    <div onClick={onClick} style={{
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: isLast ? 'none' : `1px solid ${T.stroke}`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${type.color}22`, color: type.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><TabIcon name={type.icon} size={18} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>
          {workout.name || type.label}
        </div>
        <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2, fontFamily: T.mono }}>
          {workout.time} · {fmtMinutes(workout.durationMin || 0)}
          {exCount > 0 && ` · ${exCount} תרגילים`}
        </div>
      </div>
      <div style={{ fontSize: 18, color: T.inkMute }}>›</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// New workout dialog — pick type, exercises, sets, save
// ════════════════════════════════════════════════════════════════════
function NewWorkoutDialog({ date, prefill, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  // If a prefill is supplied (from a routine), jump straight to the review step
  const [step, setStep] = React.useState(prefill ? 2 : 0); // 0=type, 1=exercises, 2=review
  const [name, setName] = React.useState(prefill?.name || '');
  const [type, setType] = React.useState(prefill?.type || 'strength');
  const [duration, setDuration] = React.useState(prefill?.duration || 30);
  const [notes, setNotes] = React.useState('');
  const [exercises, setExercises] = React.useState(prefill?.exercises || []); // [{ exerciseId, name, sets, notes }]
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // QA5: confirm close if user has typed something or added exercises
  const [confirmCloseUnsaved, setConfirmCloseUnsaved] = React.useState(false);

  // "Has unsaved progress" — covers all three steps. Prefill from a routine
  // counts as having progress (user came here intentionally to save).
  const hasUnsavedProgress = !!(
    prefill ||
    name.trim() ||
    notes.trim() ||
    (exercises && exercises.length > 0) ||
    step > 0
  );

  const guardedClose = () => {
    if (hasUnsavedProgress) setConfirmCloseUnsaved(true);
    else onClose();
  };

  const handleAddExercise = (catalogEx) => {
    setExercises(arr => [...arr, {
      id: uid(),
      exerciseId: catalogEx.id,
      name: catalogEx.name,
      muscle: catalogEx.muscle,
      hasWeight: catalogEx.hasWeight,
      isDuration: !!catalogEx.isDuration,
      sets: catalogEx.isDuration
        ? [{ durationSec: 60, distanceM: 0 }]
        : [{ reps: 10, weight: catalogEx.hasWeight ? 0 : null }],
      notes: '',
    }]);
    setPickerOpen(false);
  };

  const handleAddCustomExercise = (customName) => {
    setExercises(arr => [...arr, {
      id: uid(),
      exerciseId: null,
      name: customName,
      muscle: null,
      hasWeight: true,
      isDuration: false,
      sets: [{ reps: 10, weight: 0 }],
      notes: '',
    }]);
    setPickerOpen(false);
  };

  const handleRemoveExercise = (id) => {
    setExercises(arr => arr.filter(e => e.id !== id));
  };

  const handleUpdateExercise = (id, updates) => {
    setExercises(arr => arr.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleSave = () => {
    if (!type) return;
    // N4: name is truly optional. Priority: user input → first exercise name
    // → workout type label. If the user chose multiple exercises, the first
    // one's name is more useful than a generic "כוח".
    const finalName = name.trim()
      || (exercises[0]?.name)
      || getWorkoutType(type).label;
    dispatch({
      type: 'ADD_WORKOUT',
      date,
      workout: {
        time: nowHHMM(),
        name: finalName,
        type,
        durationMin: duration,
        notes: notes.trim(),
        exercises,
      },
    });
    trackEvent('Workout Logged', {
      type,
      method: 'full',
      exercise_count: exercises.length,
    });
    toast('האימון נשמר!', { type: 'success' });
    onClose();
  };

  const canProceedFromStep0 = !!type;
  const canSave = !!type && (exercises.length > 0 || duration > 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 825,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={guardedClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>אימון חדש</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {step === 0 ? 'סוג ופרטים' : step === 1 ? 'תרגילים' : 'אישור'}
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '10px 18px 4px', display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? T.lime : T.stroke,
          }} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 80px' }}>
        {/* Step 0: type, name, duration */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>סוג אימון</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {WORKOUT_TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)} style={{
                  padding: 12, background: type === t.id ? `${t.color}22` : T.bgElev,
                  border: `1.5px solid ${type === t.id ? t.color : T.stroke}`,
                  borderRadius: 10, cursor: 'pointer', color: T.ink,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontFamily: T.font,
                }}>
                  <div style={{ color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TabIcon name={t.icon} size={20} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>שם (אופציונלי — לאימון מורכב)</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ריק → ייקרא לפי התרגיל הראשון"
              style={{
                width: '100%', padding: '12px 14px', background: T.bgElev,
                border: `1px solid ${T.stroke}`, borderRadius: 10, color: T.ink,
                fontSize: 14, fontFamily: T.font, outline: 'none',
                direction: 'rtl', textAlign: 'right', marginBottom: 16,
              }}
            />

            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>משך משוער (דקות)</div>
            <NumberStepper value={duration} onChange={setDuration} min={5} max={300} step={5} unit="דק׳" />

            <div style={{ marginTop: 16, fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>הערות (אופציונלי)</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="איך הרגשת? משהו לזכור..."
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', background: T.bgElev,
                border: `1px solid ${T.stroke}`, borderRadius: 10, color: T.ink,
                fontSize: 13, fontFamily: T.font, outline: 'none', resize: 'vertical',
                direction: 'rtl', textAlign: 'right',
              }}
            />
          </>
        )}

        {/* Step 1: add exercises */}
        {step === 1 && (
          <>
            {exercises.length === 0 ? (
              <div style={{ padding: '30px 12px', textAlign: 'center' }}>
                <div style={{ marginBottom: 10, color: T.lime, display: 'flex', justifyContent: 'center' }}>
                  <TabIcon name="target" size={36} />
                </div>
                <div style={{ fontSize: 13, color: T.inkSub, marginBottom: 14 }}>
                  הוסף תרגילים לאימון.<br/>
                  אופציונלי — אפשר לדלג ולשמור רק את המשך והסוג.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {exercises.map((ex, idx) => (
                  <ExerciseInWorkoutCard key={ex.id} exercise={ex} index={idx + 1}
                    onUpdate={(updates) => handleUpdateExercise(ex.id, updates)}
                    onRemove={() => handleRemoveExercise(ex.id)}
                  />
                ))}
              </div>
            )}

            <button onClick={() => setPickerOpen(true)} style={{
              width: '100%', padding: 14, background: T.bgElev,
              border: `1.5px dashed ${T.lime}`, borderRadius: 10,
              color: T.lime, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: T.font, marginTop: 4,
            }}>
              + הוסף תרגיל
            </button>
          </>
        )}

        {/* Step 2: review */}
        {step === 2 && (
          <ReviewWorkout
            name={name}
            type={type}
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            exercises={exercises}
          />
        )}
      </div>

      {/* Footer buttons */}
      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${T.stroke}`,
        background: T.bg, display: 'flex', gap: 10,
      }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: 14, background: T.bgElev, border: `1px solid ${T.stroke}`,
            borderRadius: 10, color: T.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: T.font,
          }}>חזרה</button>
        )}
        {step < 2 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !canProceedFromStep0}
            style={{
              flex: 2, padding: 14,
              background: (step === 0 && !canProceedFromStep0) ? T.bgElev2 : T.lime,
              color: (step === 0 && !canProceedFromStep0) ? T.inkMute : T.bg,
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              cursor: (step === 0 && !canProceedFromStep0) ? 'not-allowed' : 'pointer',
              fontFamily: T.font,
            }}>המשך</button>
        ) : (
          <button onClick={handleSave} disabled={!canSave} style={{
            flex: 2, padding: 14,
            background: canSave ? T.lime : T.bgElev2,
            color: canSave ? T.bg : T.inkMute,
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700,
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: T.font,
          }}>שמור אימון</button>
        )}
      </div>

      {pickerOpen && <ExercisePicker onPick={handleAddExercise} onAddCustom={handleAddCustomExercise} onClose={() => setPickerOpen(false)} />}

      {/* QA5: unsaved-changes guard for NewWorkoutDialog */}
      <ConfirmDialog
        open={confirmCloseUnsaved}
        title="לסגור בלי לשמור?"
        message={personaStr(state, 'unsaved_changes_warning',
          'יש שינויים שלא נשמרו. לסגור בכל זאת?')}
        confirmLabel="סגור בלי לשמור"
        cancelLabel="חזור"
        danger
        onConfirm={() => { setConfirmCloseUnsaved(false); onClose(); }}
        onCancel={() => setConfirmCloseUnsaved(false)}
      />
    </div>
  );
}

// ─── Exercise picker ─────────────────────────────────────────────
function ExercisePicker({ onPick, onAddCustom, onClose }) {
  const [activeMuscle, setActiveMuscle] = React.useState('chest');
  const [query, setQuery] = React.useState('');
  const [customName, setCustomName] = React.useState('');

  const filteredByMuscle = exercisesByMuscle(activeMuscle);
  const filtered = query.trim()
    ? EXERCISE_CATALOG.filter(e => e.name.includes(query))
    : filteredByMuscle;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 830,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>תרגילים</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>בחר תרגיל</div>
        </div>
      </div>

      <div style={{ padding: '12px 18px 6px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש תרגיל..."
          style={{
            width: '100%', padding: '10px 14px', background: T.bgElev,
            border: `1px solid ${T.stroke}`, borderRadius: 10, color: T.ink,
            fontSize: 13, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right',
          }}
        />
      </div>

      {!query.trim() && (
        <div style={{ padding: '6px 18px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {MUSCLE_GROUPS.map(m => (
            <button key={m.id} onClick={() => setActiveMuscle(m.id)} style={{
              display: 'inline-block', marginLeft: 6, padding: '6px 12px', fontSize: 12,
              borderRadius: 999, border: `1px solid ${activeMuscle === m.id ? T.lime : T.stroke}`,
              background: activeMuscle === m.id ? T.lime : 'transparent',
              color: activeMuscle === m.id ? T.bg : T.inkSub,
              fontFamily: T.font, cursor: 'pointer', fontWeight: activeMuscle === m.id ? 700 : 500,
            }}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 100px' }}>
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => onPick(ex)} style={{
            width: '100%', padding: '12px 14px', marginBottom: 6,
            background: T.bgElev, border: `1px solid ${T.stroke}`, borderRadius: 10,
            color: T.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: T.font, textAlign: 'right', direction: 'rtl',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{ex.name}</span>
            <span style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
              {ex.hasWeight ? 'כוח' : ex.isDuration ? 'זמן' : 'משקל גוף'}
            </span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
            אין תרגילים שמתאימים
          </div>
        )}

        {/* Custom exercise */}
        <div style={{ marginTop: 16, padding: 12, border: `1px dashed ${T.stroke}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
            תרגיל מותאם אישית
          </div>
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="שם התרגיל..."
            style={{
              width: '100%', padding: '10px 14px', background: T.bg,
              border: `1px solid ${T.stroke}`, borderRadius: 10, color: T.ink,
              fontSize: 13, fontFamily: T.font, outline: 'none',
              direction: 'rtl', textAlign: 'right', marginBottom: 8, boxSizing: 'border-box',
            }}
          />
          <button onClick={() => customName.trim() && onAddCustom(customName.trim())} disabled={!customName.trim()} style={{
            width: '100%', padding: 10,
            background: customName.trim() ? T.lime : T.bgElev2,
            color: customName.trim() ? T.bg : T.inkMute,
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700,
            cursor: customName.trim() ? 'pointer' : 'not-allowed',
            fontFamily: T.font,
          }}>הוסף תרגיל</button>
        </div>
      </div>
    </div>
  );
}

// ─── Exercise inside a workout ─────────────────────────────────────
function ExerciseInWorkoutCard({ exercise, index, onUpdate, onRemove }) {
  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet = exercise.isDuration
      ? { durationSec: lastSet?.durationSec || 60, distanceM: lastSet?.distanceM || 0 }
      : { reps: lastSet?.reps || 10, weight: lastSet?.weight ?? (exercise.hasWeight ? 0 : null) };
    onUpdate({ sets: [...exercise.sets, newSet] });
  };

  const updateSet = (idx, updates) => {
    onUpdate({
      sets: exercise.sets.map((s, i) => i === idx ? { ...s, ...updates } : s),
    });
  };

  const removeSet = (idx) => {
    if (exercise.sets.length === 1) return; // need at least one
    onUpdate({ sets: exercise.sets.filter((_, i) => i !== idx) });
  };

  return (
    <Card padding={12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 12, background: T.lime, color: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, fontFamily: T.mono,
        }}>{index}</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.ink }}>{exercise.name}</div>
        <button onClick={onRemove} style={{
          background: 'transparent', border: 'none', color: T.rose,
          cursor: 'pointer', fontSize: 18, padding: 4,
        }}>×</button>
      </div>

      {/* Sets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exercise.sets.map((s, i) => (
          <SetRow key={i}
            index={i + 1}
            set={s}
            isDuration={exercise.isDuration}
            hasWeight={exercise.hasWeight}
            canRemove={exercise.sets.length > 1}
            onUpdate={(updates) => updateSet(i, updates)}
            onRemove={() => removeSet(i)}
          />
        ))}
      </div>

      <button onClick={addSet} style={{
        marginTop: 8, width: '100%', padding: 8,
        background: 'transparent', border: `1px dashed ${T.stroke}`, borderRadius: 8,
        color: T.inkSub, fontSize: 12, cursor: 'pointer',
        fontFamily: T.font,
      }}>+ סט</button>
    </Card>
  );
}

function SetRow({ index, set, isDuration, hasWeight, canRemove, onUpdate, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 20, fontSize: 11, color: T.inkMute, fontFamily: T.mono, textAlign: 'center',
      }}>{index}.</div>

      {isDuration ? (
        <>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={set.durationSec || ''}
              onChange={e => onUpdate({ durationSec: parseInt(e.target.value) || 0 })}
              placeholder="שניות"
              style={workoutInputStyle}
            />
          </div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, width: 30 }}>שנ׳</div>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={set.distanceM || ''}
              onChange={e => onUpdate({ distanceM: parseInt(e.target.value) || 0 })}
              placeholder="מרחק"
              style={workoutInputStyle}
            />
          </div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, width: 30 }}>מ׳</div>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={set.reps || ''}
              onChange={e => onUpdate({ reps: parseInt(e.target.value) || 0 })}
              placeholder="חזרות"
              style={workoutInputStyle}
            />
          </div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, width: 30 }}>חזר׳</div>
          {hasWeight && (
            <>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  step="0.5"
                  value={set.weight ?? ''}
                  onChange={e => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
                  placeholder="קג"
                  style={workoutInputStyle}
                />
              </div>
              <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, width: 30 }}>ק״ג</div>
            </>
          )}
        </>
      )}

      {canRemove && (
        <button onClick={onRemove} style={{
          background: 'transparent', border: 'none', color: T.inkMute,
          cursor: 'pointer', fontSize: 16, padding: '0 4px',
        }}>×</button>
      )}
    </div>
  );
}

// ─── Review screen ─────────────────────────────────────────────────
// `setDuration` (optional) enables the auto-calculate button. When omitted
// the duration row is read-only.
function ReviewWorkout({ name, type, duration, setDuration, notes, exercises }) {
  const t = getWorkoutType(type);
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);

  // Display name follows the same rule as handleSave — first exercise wins
  // when the user left the name blank.
  const displayName = name.trim() || (exercises[0]?.name) || t.label;

  // N5 auto-duration: each set is roughly (reps × 3s) + 60s rest, or the
  // direct duration for time-based exercises. Caps at 1 minute minimum.
  const autoDurationMin = React.useMemo(() => {
    let secs = 0;
    exercises.forEach(ex => {
      (ex.sets || []).forEach(s => {
        if (ex.isDuration) {
          secs += (s.durationSec || 0);
        } else {
          secs += (s.reps || 0) * 3 + 60;
        }
      });
    });
    return Math.max(1, Math.round(secs / 60));
  }, [exercises]);

  const canAutoCalc = !!setDuration && exercises.length > 0 && autoDurationMin !== duration;

  return (
    <div>
      <Card padding={14} style={{ marginBottom: 12, background: `${t.color}10`, border: `1px solid ${t.color}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TabIcon name={t.icon} size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{displayName}</div>
            <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono }}>
              {t.label} · {fmtMinutes(duration)} · {exercises.length} תרגילים · {totalSets} סטים
            </div>
          </div>
        </div>
        {/* N5: auto-duration suggestion */}
        {canAutoCalc && (
          <button onClick={() => setDuration(autoDurationMin)} style={{
            marginTop: 8, width: '100%', padding: '8px 12px',
            background: 'transparent', border: `1px dashed ${t.color}88`,
            borderRadius: 8, color: t.color, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: T.font,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <TabIcon name="repeat" size={12} />
            <span>חשב אוטומטית · ~{fmtMinutes(autoDurationMin)}</span>
          </button>
        )}
      </Card>

      {exercises.map((ex, idx) => (
        <Card key={ex.id} padding={10} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {idx + 1}. {ex.name}
          </div>
          <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono }}>
            {ex.sets.map((s, i) => {
              if (ex.isDuration) {
                return `${s.durationSec || 0}שנ${s.distanceM ? `/${s.distanceM}מ` : ''}`;
              }
              return ex.hasWeight ? `${s.reps}×${s.weight}ק״ג` : `${s.reps} חזרות`;
            }).join(' · ')}
          </div>
        </Card>
      ))}

      {notes && (
        <Card padding={10} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>הערות</div>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{notes}</div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Workout detail dialog — view/edit existing workout
// ════════════════════════════════════════════════════════════════════
function WorkoutDetailDialog({ date, workout, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [saveAsRoutine, setSaveAsRoutine] = React.useState(false);

  const t = getWorkoutType(workout.type || 'other');
  const totalSets = (workout.exercises || []).reduce((s, e) => s + (e.sets?.length || 0), 0);
  const volume = workoutVolume(workout);
  const sessions = state.workouts?.sessions || {};
  const newPRs = React.useMemo(
    () => findNewPRs(sessions, date, workout),
    [sessions, date, workout]
  );
  const hasExercises = (workout.exercises || []).length > 0;

  const handleDelete = () => {
    const workoutCopy = { ...workout };
    dispatch({ type: 'DELETE_WORKOUT', date, workoutId: workout.id });
    toast('האימון נמחק', {
      type: 'info',
      duration: 5000,
      actionLabel: 'בטל',
      onAction: () => {
        dispatch({ type: 'ADD_WORKOUT', date, workout: workoutCopy });
      },
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 825,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
            {fmt.day(date)} · {workout.time}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{workout.name}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {/* PR banner — shows broken records, if any */}
        {newPRs.length > 0 && <PRBanner prs={newPRs} />}

        {/* Header card */}
        <Card padding={14} style={{ marginBottom: 12, background: `${t.color}10`, border: `1px solid ${t.color}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TabIcon name={t.icon} size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.inkMute, fontFamily: T.mono }}>{t.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtMinutes(workout.durationMin || 0)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.inkSub, fontFamily: T.mono }}>
            <div>{(workout.exercises || []).length} תרגילים</div>
            <div>·</div>
            <div>{totalSets} סטים</div>
            {volume > 0 && <><div>·</div><div>נפח {volume}ק״ג</div></>}
          </div>
        </Card>

        {/* Exercises */}
        {(workout.exercises || []).length > 0 && (
          <>
            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              תרגילים
            </div>
            {(workout.exercises || []).map((ex, idx) => (
              <Card key={ex.id || idx} padding={12} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  {idx + 1}. {ex.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(ex.sets || []).map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: T.inkSub, fontFamily: T.mono,
                    }}>
                      <span style={{ width: 20, color: T.inkMute }}>{i + 1}.</span>
                      <span>
                        {ex.isDuration
                          ? `${s.durationSec || 0} שנ׳${s.distanceM ? ` · ${s.distanceM} מ׳` : ''}`
                          : ex.hasWeight
                            ? `${s.reps} חזרות × ${s.weight} ק״ג`
                            : `${s.reps} חזרות`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Notes */}
        {workout.notes && (
          <Card padding={12} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>הערות</div>
            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>{workout.notes}</div>
          </Card>
        )}

        {/* Save as routine — only useful if there are exercises to template */}
        {hasExercises && (
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setSaveAsRoutine(true)} style={{
              width: '100%', padding: 14, background: T.bgElev, border: `1px solid ${T.cyan}55`,
              borderRadius: 10, color: T.cyan, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="save" size={14} /> שמור כרוטינה
            </button>
          </div>
        )}

        {/* Delete button */}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setConfirmDelete(true)} style={{
            width: '100%', padding: 14, background: 'transparent', border: `1px solid ${T.rose}55`,
            borderRadius: 10, color: T.rose, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
          }}>מחק אימון</button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="למחוק את האימון?"
        message={personaStr(state, 'confirm_delete_workout',
          'פעולה זו תסיר את האימון לצמיתות.')}
        confirmLabel="מחק"
        cancelLabel="ביטול"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {saveAsRoutine && <SaveAsRoutineDialog
        defaultName={workout.name || ''}
        workout={workout}
        onClose={() => setSaveAsRoutine(false)}
      />}
    </div>
  );
}

// ─── Shared input style ─────────────────────────────────────────────
const workoutInputStyle = {
  width: '100%', padding: '8px 10px', background: T.bg,
  border: `1px solid ${T.stroke}`, borderRadius: 8, color: T.ink,
  fontSize: 13, fontFamily: T.mono, outline: 'none',
  direction: 'ltr', textAlign: 'center', boxSizing: 'border-box',
};

// ════════════════════════════════════════════════════════════════════
// PR banner — shows when this workout broke one or more records
// ════════════════════════════════════════════════════════════════════
function PRBanner({ prs }) {
  if (!prs || prs.length === 0) return null;
  const labelFor = (kind) => kind === 'weight' ? 'משקל' : kind === 'reps' ? 'חזרות' : 'נפח';
  const fmtVal = (k) => k.kind === 'volume' ? `${k.value} ק״ג` : k.kind === 'weight' ? `${k.value} ק״ג` : `${k.value}`;
  const fmtPrev = (k) => k.kind === 'volume' ? `${k.prevValue} ק״ג` : k.kind === 'weight' ? `${k.prevValue} ק״ג` : `${k.prevValue}`;

  return (
    <Card padding={14} style={{
      marginBottom: 12,
      background: `linear-gradient(135deg, ${T.amber}25 0%, ${T.amber}10 100%)`,
      border: `1px solid ${T.amber}66`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TabIcon name="trophy" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>שיא חדש!</div>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>
            {prs.length} {prs.length === 1 ? 'תרגיל שבר שיא' : 'תרגילים שברו שיא'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {prs.map((pr, i) => (
          <div key={i} style={{
            padding: '8px 10px', background: T.bg, borderRadius: 8,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{pr.exerciseName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {pr.kinds.map((k, j) => (
                <div key={j} style={{
                  fontSize: 11, fontFamily: T.mono, color: T.inkSub,
                  padding: '3px 8px', background: T.bgElev,
                  border: `1px solid ${T.amber}55`, borderRadius: 6,
                }}>
                  {labelFor(k.kind)}: <span style={{ color: T.amber, fontWeight: 700 }}>{fmtVal(k)}</span>
                  <span style={{ color: T.inkMute }}> (היה {fmtPrev(k)})</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// Personal Records screen — full list of per-exercise PRs
// ════════════════════════════════════════════════════════════════════
function PersonalRecordsScreen({ onClose }) {
  const { state } = useStore();
  const sessions = state.workouts?.sessions || {};

  const prs = React.useMemo(() => computePRsByExercise(sessions), [sessions]);
  const list = Object.values(prs).sort((a, b) => {
    const aw = a.maxWeight?.weight || 0;
    const bw = b.maxWeight?.weight || 0;
    if (bw !== aw) return bw - aw;
    return (b.maxVolume?.volume || 0) - (a.maxVolume?.volume || 0);
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 830,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>שיאים</div>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="trophy" size={16} color={T.amber} /> שיאים אישיים
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '60px 12px', textAlign: 'center' }}>
            <div style={{ marginBottom: 12, color: T.inkMute, opacity: 0.6, display: 'flex', justifyContent: 'center' }}>
              <TabIcon name="dumbbell" size={44} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
              אין עדיין שיאים
            </div>
            <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              שיא נחשב אחרי שתרגיל מופיע ב-{PR_MIN_OCCURRENCES} אימונים שונים לפחות.
              תמשיך לתעד — יופיעו פה אוטומטית.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              {list.length} תרגילים · מינ׳ {PR_MIN_OCCURRENCES} אימונים לתרגיל
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(pr => <PRRow key={pr.key} pr={pr} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PRRow({ pr }) {
  return (
    <Card padding={12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.ink }}>{pr.name}</div>
        <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>{pr.occurrences} אימונים</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <PRStat label="משקל" value={pr.maxWeight ? `${pr.maxWeight.weight}` : '—'}
          unit={pr.maxWeight ? 'ק״ג' : ''}
          sub={pr.maxWeight ? `× ${pr.maxWeight.reps}` : ''}
          color={T.amber}
        />
        <PRStat label="חזרות" value={pr.maxReps ? `${pr.maxReps.reps}` : '—'}
          unit=""
          sub={pr.maxReps && pr.maxReps.weight > 0 ? `${pr.maxReps.weight}ק״ג` : ''}
          color={T.lime}
        />
        <PRStat label="נפח" value={pr.maxVolume ? (pr.maxVolume.volume >= 1000 ? `${(pr.maxVolume.volume/1000).toFixed(1)}k` : `${pr.maxVolume.volume}`) : '—'}
          unit={pr.maxVolume ? 'ק״ג' : ''}
          sub=""
          color={T.cyan}
        />
      </div>
    </Card>
  );
}

function PRStat({ label, value, unit, sub, color }) {
  return (
    <div style={{
      padding: '8px 6px', background: T.bg, borderRadius: 8, textAlign: 'center',
      border: `1px solid ${T.stroke}`,
    }}>
      <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3, marginTop: 3 }}>
        <span style={{ fontFamily: T.mono, fontSize: 17, fontWeight: 700, color }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: T.inkMute }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// WorkoutSearchDialog — search across all workouts ever recorded
// ════════════════════════════════════════════════════════════════════
function WorkoutSearchDialog({ onClose, onJumpToDate }) {
  const { state } = useStore();
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Flatten every workout, attach date + computed search blob
  const allWorkouts = React.useMemo(() => {
    const out = [];
    const sessions = state.workouts?.sessions || {};
    Object.keys(sessions).forEach(date => {
      (sessions[date] || []).forEach(w => {
        const typeLabel = (getWorkoutType(w.type || 'other')).label || '';
        const exerciseNames = (w.exercises || []).map(e => e.name || '').join(' ');
        const blob = `${w.name || ''} ${typeLabel} ${w.notes || ''} ${exerciseNames}`.toLowerCase();
        out.push({ ...w, _date: date, _blob: blob });
      });
    });
    out.sort((a, b) => {
      if (a._date !== b._date) return b._date.localeCompare(a._date);
      return (b.time || '').localeCompare(a.time || '');
    });
    return out;
  }, [state.workouts?.sessions]);

  const filtered = query.trim()
    ? allWorkouts.filter(w => w._blob.includes(query.toLowerCase()))
    : allWorkouts.slice(0, 50);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 825,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>חיפוש</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>בכל האימונים</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 8px' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש לפי שם, סוג, תרגיל, או הערה..."
          style={{
            width: '100%', padding: '12px 16px', background: T.bgElev,
            border: `1px solid ${T.stroke}`, borderRadius: 10,
            color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right',
          }}
        />
      </div>

      <div style={{ padding: '4px 18px', fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
        {query.trim() ? `${filtered.length} תוצאות` : `${filtered.length} אימונים אחרונים`}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: T.inkMute }}>
            {query.trim() ? 'אין אימונים שמתאימים' : 'עדיין לא נרשמו אימונים'}
          </div>
        ) : (
          filtered.map(w => {
            const tp = getWorkoutType(w.type || 'other');
            const exCount = (w.exercises || []).length;
            const exNames = (w.exercises || []).map(e => e.name).filter(Boolean).slice(0, 3).join(' · ');
            return (
              <Card key={`${w._date}-${w.id}`} padding={12} style={{ marginBottom: 8, cursor: 'pointer' }}
                onClick={() => onJumpToDate(w._date, w.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 0.5 }}>
                    {fmt.day(w._date)} · {w.time}
                  </div>
                  <div style={{ fontSize: 10, color: tp.color, fontFamily: T.mono, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <TabIcon name={tp.icon} size={11} />
                    <span>{tp.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>
                  {w.name || tp.label}
                </div>
                <div style={{ fontSize: 11, color: T.inkSub, marginTop: 4, fontFamily: T.mono }}>
                  {fmtMinutes(w.durationMin || 0)}
                  {exCount > 0 && ` · ${exCount} תרגילים`}
                  {exNames && <span style={{ color: T.inkMute }}> · {exNames}{exCount > 3 ? '...' : ''}</span>}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SaveAsRoutineDialog — small modal asking for a routine name
// ════════════════════════════════════════════════════════════════════
function SaveAsRoutineDialog({ defaultName, workout, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [name, setName] = React.useState(defaultName || '');

  const save = () => {
    const finalName = name.trim() || defaultName.trim() || 'רוטינה ללא שם';
    // Strip per-set tracking so the routine is a clean template:
    // keep exerciseId/name/muscle/hasWeight/isDuration + the structure of sets
    // (reps/weight defaults, durationSec defaults), but forget the actual values
    // entered for THIS specific workout.
    const exTemplate = (workout.exercises || []).map(ex => ({
      exerciseId: ex.exerciseId || null,
      name: ex.name,
      muscle: ex.muscle || null,
      hasWeight: ex.hasWeight !== false,
      isDuration: !!ex.isDuration,
      sets: (ex.sets || []).map(s => ex.isDuration
        ? { durationSec: s.durationSec || 60, distanceM: s.distanceM || 0 }
        : { reps: s.reps || 10, weight: ex.hasWeight ? (s.weight || 0) : null }
      ),
      notes: '',
    }));
    dispatch({
      type: 'SAVE_ROUTINE',
      routine: {
        name: finalName,
        type: workout.type || 'strength',
        durationMin: workout.durationMin || 30,
        exercises: exTemplate,
      },
    });
    toast('נשמר כרוטינה', { type: 'success' });
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 360, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>שמור כרוטינה</div>
        <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.5, marginBottom: 14 }}>
          תרגילים והסטים יישמרו כתבנית. תוכל להתחיל אימון חדש מהרוטינה בלחיצה אחת.
        </div>

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שם הרוטינה</div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="למשל: יום A · חזה וכתפיים"
          style={{
            width: '100%', padding: '12px 14px', background: T.bg, border: `1px solid ${T.stroke}`,
            borderRadius: 10, color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save}>שמור</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// RoutinesDialog — list of saved routines, start or delete
// ════════════════════════════════════════════════════════════════════
function RoutinesDialog({ onClose, onStartRoutine }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const routines = state.workouts?.routines || {};
  const list = Object.values(routines).sort((a, b) => {
    return (b.lastUsed || '').localeCompare(a.lastUsed || '')
        || (b.useCount || 0) - (a.useCount || 0);
  });

  const handleDelete = (routine) => {
    const routineCopy = { ...routine };
    dispatch({ type: 'DELETE_ROUTINE', routineId: routine.id });
    toast('הרוטינה נמחקה', {
      type: 'info',
      duration: 5000,
      actionLabel: 'בטל',
      onAction: () => {
        dispatch({ type: 'SAVE_ROUTINE', routine: routineCopy });
      },
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 830,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>רוטינות</div>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="clipboard-list" size={16} color={T.cyan} /> הרוטינות שלי
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '60px 12px', textAlign: 'center' }}>
            <div style={{ marginBottom: 10, color: T.inkMute, opacity: 0.6, display: 'flex', justifyContent: 'center' }}>
              <TabIcon name="clipboard-list" size={44} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
              אין עדיין רוטינות
            </div>
            <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              פתח אימון קיים → "שמור כרוטינה" → תופיע כאן.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
              {list.length} רוטינות
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.map(r => <RoutineRow key={r.id} routine={r}
                onStart={() => onStartRoutine(r)}
                onDelete={() => handleDelete(r)}
              />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoutineRow({ routine, onStart, onDelete }) {
  const tp = getWorkoutType(routine.type || 'strength');
  const exCount = (routine.exercises || []).length;
  const setCount = (routine.exercises || []).reduce((s, e) => s + (e.sets?.length || 0), 0);
  return (
    <Card padding={12} style={{ background: `${tp.color}10`, border: `1px solid ${tp.color}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${tp.color}33`, color: tp.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><TabIcon name={tp.icon} size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {routine.name}
          </div>
          <div style={{ fontSize: 11, color: T.inkSub, marginTop: 2, fontFamily: T.mono }}>
            {tp.label} · {exCount} תרגילים · {setCount} סטים
          </div>
        </div>
        <button onClick={onDelete} aria-label="מחק רוטינה" style={{
          background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer',
          padding: 6,
        }}><TabIcon name="trash" size={16} /></button>
      </div>

      {routine.useCount > 0 && (
        <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginBottom: 8 }}>
          נעשה {routine.useCount} פעמים{routine.lastUsed ? ` · ${fmt.relativeDay(routine.lastUsed.slice(0, 10))}` : ''}
        </div>
      )}

      <button onClick={onStart} style={{
        width: '100%', padding: 10, background: tp.color, color: T.bg,
        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
        fontFamily: T.font, cursor: 'pointer',
      }}>▶ התחל אימון מהרוטינה</button>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════
// QuickLogDialog — single-screen spontaneous workout entry (~10s flow)
// ════════════════════════════════════════════════════════════════════
//
// Use case: "I just did 30 push-ups." Instead of the 3-step NewWorkoutDialog
// the user picks an exercise from a single dropdown, types reps (and optionally
// weight), picks "now/earlier/yesterday", hits save. Done.
//
// Optional voice input: 🎤 button only renders when Web Speech API is available
// (per UX decision in N1: hidden if unsupported, no scolding "not available").

function _isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.webkitSpeechRecognition || window.SpeechRecognition);
}

function QuickLogDialog({ onClose, prefill }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  // ── form state (everything in this dialog) ──────────────────────────
  const [exerciseId, setExerciseId] = React.useState(prefill?.exerciseId || '');
  const [customName, setCustomName] = React.useState(prefill?.customName || '');
  const [reps, setReps] = React.useState(prefill?.reps || 10);
  const [durationSec, setDurationSec] = React.useState(prefill?.durationSec || 60);
  const [weight, setWeight] = React.useState(prefill?.weight || 0);
  const [whenChoice, setWhenChoice] = React.useState('now');
  const [customDate, setCustomDate] = React.useState(todayISO());
  const [customTime, setCustomTime] = React.useState(nowHHMM());
  const [showVoice, setShowVoice] = React.useState(false);
  const [showFreeText, setShowFreeText] = React.useState(false);

  // ── derived from exerciseId ─────────────────────────────────────────
  const isCustom = exerciseId === '__custom__';
  const catalogEx = exerciseId && !isCustom ? getExercise(exerciseId) : null;
  const isDuration = !!(catalogEx?.isDuration);
  const hasWeight = !!(catalogEx?.hasWeight);
  // Display name used in toast & saved workout
  const displayName = isCustom ? customName.trim() : (catalogEx?.name || '');

  const speechAvailable = React.useMemo(() => _isSpeechSupported(), []);

  // ── compute the actual date+time for save ──────────────────────────
  const resolvedWhen = React.useMemo(() => {
    const now = new Date();
    if (whenChoice === 'now')      return { date: todayISO(), time: nowHHMM() };
    if (whenChoice === 'morning')  return { date: todayISO(), time: '08:00' };
    if (whenChoice === 'yesterday') return { date: addDaysISO(todayISO(), -1), time: '08:00' };
    if (whenChoice === 'hour_ago') {
      const t = new Date(now.getTime() - 60 * 60 * 1000);
      const date = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
      const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
      return { date, time };
    }
    // custom
    return { date: customDate, time: customTime };
  }, [whenChoice, customDate, customTime]);

  // ── validation ──────────────────────────────────────────────────────
  const valid = (() => {
    if (!exerciseId) return false;
    if (isCustom && !customName.trim()) return false;
    if (isDuration && (!durationSec || durationSec <= 0)) return false;
    if (!isDuration && (!reps || reps <= 0)) return false;
    return true;
  })();

  // ── save → ADD_WORKOUT, persona-aware toast, close ──────────────────
  const handleSave = () => {
    if (!valid) return;
    const { date, time } = resolvedWhen;

    // Determine workout type from exercise category, falling back to 'other'
    const wType = catalogEx?.category
      || (isCustom ? 'other' : 'other');

    // Auto-estimate duration: each rep ~3s + 60s rest, or use durationSec directly
    const durationMin = isDuration
      ? Math.max(1, Math.round(durationSec / 60))
      : Math.max(1, Math.round((reps * 3 + 60) / 60));

    const oneSet = isDuration
      ? { durationSec, distanceM: 0 }
      : { reps, weight: (hasWeight || (isCustom && weight > 0)) ? weight : null };

    dispatch({
      type: 'ADD_WORKOUT',
      date,
      workout: {
        time,
        name: '',  // quick logs don't need a name; row will show exercise name
        type: wType,
        durationMin,
        notes: '',
        exercises: [{
          id: uid(),
          exerciseId: isCustom ? null : exerciseId,
          name: displayName,
          muscle: catalogEx?.muscle || null,
          hasWeight: hasWeight || (isCustom && weight > 0),
          isDuration: isDuration,
          sets: [oneSet],
          notes: '',
        }],
      },
    });
    // v3.17: quick log — different funnel than the full workout form
    trackEvent('Workout Logged', {
      type: wType,
      method: 'quick',
      exercise_count: 1,
    });

    // Persona toast — vars: {EX} = exercise name, {REPS} = reps or minutes
    const repsForVar = isDuration ? Math.round(durationSec / 60) : reps;
    const fallback = isDuration
      ? `נשמר: ${repsForVar} דקות ${displayName}`
      : `נשמר: ${repsForVar} ${displayName}`;
    toast(personaStr(state, 'quick_log_saved', fallback, { EX: displayName, REPS: repsForVar }),
      { type: 'success', duration: 3500 });

    onClose();
  };

  // ── voice integration: parsed result → fills the form ───────────────
  const handleVoiceResult = (parsed, transcriptText) => {
    setShowVoice(false);
    if (!parsed) return;
    // Map AI result → form state. exerciseId may be a catalog id, or null
    // (custom). When null, fall back to exerciseName from the parser.
    if (parsed.exerciseId && getExercise(parsed.exerciseId)) {
      setExerciseId(parsed.exerciseId);
      setCustomName('');
    } else if (parsed.exerciseName) {
      setExerciseId('__custom__');
      setCustomName(parsed.exerciseName);
    }
    if (parsed.reps && parsed.reps > 0) setReps(parsed.reps);
    if (parsed.durationSec && parsed.durationSec > 0) setDurationSec(parsed.durationSec);
    if (parsed.weight && parsed.weight > 0) setWeight(parsed.weight);
    // No auto-save — user always reviews + clicks save (per N2 UX decision)
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 835,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} aria-label="סגור" style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>רישום מהיר</div>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="zap" size={16} color={T.lime} /> רישום מהיר
          </div>
        </div>
        {/* BUG3: free-text always available; voice gated on Web Speech API */}
        <button onClick={() => setShowFreeText(true)} aria-label="כתיבה חופשית" style={{
          background: T.bgElev, color: T.ink, border: `1px solid ${T.stroke}`,
          padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="edit" size={14} /> כתיבה
        </button>
        {speechAvailable && (
          <button onClick={() => setShowVoice(true)} aria-label="הקלטה" style={{
            background: `${T.lime}22`, color: T.lime, border: `1px solid ${T.lime}55`,
            padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="microphone" size={14} /> דבר
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 24px' }}>
        {/* Exercise selector */}
        <Label>תרגיל</Label>
        <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={selectStyle}>
          <option value="">בחר תרגיל...</option>
          {MUSCLE_GROUPS.map(mg => (
            <optgroup key={mg.id} label={mg.label}>
              {EXERCISE_CATALOG.filter(ex => ex.muscle === mg.id).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </optgroup>
          ))}
          <option value="__custom__">— תרגיל מותאם —</option>
        </select>

        {isCustom && (
          <>
            <Label style={{ marginTop: 14 }}>שם התרגיל</Label>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="למשל: סקייטבורד, פעולות גן"
              style={textInputStyle}
              autoFocus
            />
          </>
        )}

        {/* Reps OR duration */}
        {exerciseId && (
          <>
            <Label style={{ marginTop: 14 }}>{isDuration ? 'משך' : 'חזרות'}</Label>
            {isDuration
              ? <NumberStepper value={Math.round(durationSec / 60)}
                  onChange={(min) => setDurationSec(min * 60)}
                  min={1} max={300} step={5} unit="דק׳" />
              : <NumberStepper value={reps}
                  onChange={setReps}
                  min={1} max={500} step={1} unit="חזרות" />
            }
          </>
        )}

        {/* Weight (only if catalog says hasWeight, or for custom) */}
        {exerciseId && (hasWeight || isCustom) && !isDuration && (
          <>
            <Label style={{ marginTop: 14 }}>
              משקל {isCustom ? <span style={{ color: T.inkMute, fontWeight: 400 }}>· אופציונלי</span> : null}
            </Label>
            <NumberStepper value={weight} onChange={setWeight}
              min={0} max={500} step={2.5} unit="ק״ג" />
          </>
        )}

        {/* Date/time selector (N6) */}
        {exerciseId && (
          <>
            <Label style={{ marginTop: 18 }}>מתי?</Label>
            <select value={whenChoice} onChange={e => setWhenChoice(e.target.value)} style={selectStyle}>
              <option value="now">עכשיו</option>
              <option value="hour_ago">לפני שעה</option>
              <option value="morning">היום בבוקר</option>
              <option value="yesterday">אתמול</option>
              <option value="custom">תאריך אחר...</option>
            </select>

            {whenChoice === 'custom' && (
              <div style={{
                marginTop: 10, padding: 12, background: T.bgElev,
                border: `1px solid ${T.stroke}`, borderRadius: 10,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginBottom: 4 }}>תאריך</div>
                  <input type="date" value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    max={todayISO()}
                    style={dateTimeInputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginBottom: 4 }}>שעה</div>
                  <input type="time" value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    style={dateTimeInputStyle} />
                </div>
              </div>
            )}

            {/* Inline preview of resolved time, so user sees what'll be saved */}
            {whenChoice !== 'now' && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.inkMute, fontFamily: T.mono, textAlign: 'center' }}>
                ייכתב כ: {fmt.day(resolvedWhen.date)} · {resolvedWhen.time}
              </div>
            )}
          </>
        )}
      </div>

      {/* Save bar (sticky bottom) */}
      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${T.stroke}`, background: T.bg,
      }}>
        <button onClick={handleSave} disabled={!valid} style={{
          width: '100%', padding: 14,
          background: valid ? T.lime : T.bgElev2,
          color: valid ? T.bg : T.inkMute,
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 800, fontFamily: T.font,
          cursor: valid ? 'pointer' : 'not-allowed',
        }}>
          {valid ? `שמור · ${displayName}` : 'בחר תרגיל'}
        </button>
      </div>

      {showVoice && <VoiceInputDialog
        onClose={() => setShowVoice(false)}
        onResult={handleVoiceResult}
      />}
      {showFreeText && <FreeTextInputDialog
        onClose={() => setShowFreeText(false)}
        onResult={(parsed, text) => { setShowFreeText(false); handleVoiceResult(parsed, text); }}
      />}
    </div>
  );
}

// Small label helper used inside QuickLog
function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6,
      ...style,
    }}>{children}</div>
  );
}

// BUG2 FIX (v3.8): the previous version used appearance: none + custom
// SVG arrow for visual consistency. On iOS Safari that combo silently
// kills the native dropdown — the <select> renders but tapping does
// nothing because the system picker is suppressed. Reverting to native
// rendering trades the cosmetic arrow for a working dropdown.
const selectStyle = {
  width: '100%', padding: '12px 14px', background: T.bgElev,
  border: `1px solid ${T.stroke}`, borderRadius: 10,
  color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
  direction: 'rtl', textAlign: 'right', boxSizing: 'border-box',
};
const textInputStyle = {
  width: '100%', padding: '12px 14px', background: T.bgElev,
  border: `1px solid ${T.stroke}`, borderRadius: 10,
  color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
  direction: 'rtl', textAlign: 'right', boxSizing: 'border-box',
};
const dateTimeInputStyle = {
  width: '100%', padding: '10px 12px', background: T.bg,
  border: `1px solid ${T.stroke}`, borderRadius: 8,
  color: T.ink, fontSize: 13, fontFamily: T.mono, outline: 'none',
  direction: 'ltr', textAlign: 'left', boxSizing: 'border-box',
};

// ════════════════════════════════════════════════════════════════════
// VoiceInputDialog — Web Speech API → Claude parser → fills QuickLog
// ════════════════════════════════════════════════════════════════════
//
// Flow:
//   idle → user taps "🎤 התחל" → 'recording' → user taps "סיים"
//      → 'transcribed' (3 buttons: ✓ שלח / ✏️ ערוך / 🎤 שוב)
//      → ✓: 'parsing' → onResult(parsed, text)
//      → ✏️: onResult({}, text) — opens QuickLog with raw text only
//      → 🎤: back to 'recording'
//
// If parsed.confidence < 0.7 OR parsed.needsConfirmation, we still call
// onResult so QuickLog opens for review (no silent low-confidence saves).

function VoiceInputDialog({ onClose, onResult }) {
  const { state, dispatch } = useStore();
  const toast = useToast();

  const [phase, setPhase] = React.useState('idle'); // idle|recording|transcribed|parsing|error
  const [transcript, setTranscript] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  const recognitionRef = React.useRef(null);

  // Build a recognition instance lazily and track it via ref so callbacks
  // can stop it. We don't put it in state — it's an imperative object.
  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('זיהוי קולי לא זמין בדפדפן הזה.');
      setPhase('error');
      return;
    }
    setTranscript('');
    setErrorMsg('');
    try {
      const rec = new SR();
      rec.lang = 'he-IL';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text.trim());
      };
      rec.onerror = (e) => {
        // Common values: 'no-speech', 'aborted', 'not-allowed', 'network'
        const msg = e.error === 'not-allowed'
          ? 'הרשאת מיקרופון נדחתה. אפשר אותה בהגדרות הדפדפן.'
          : e.error === 'no-speech'
          ? 'לא שמעתי כלום. תנסה שוב.'
          : 'שגיאה בזיהוי קולי. תנסה שוב.';
        setErrorMsg(msg);
        setPhase('error');
      };
      rec.onend = () => {
        // Move to transcribed only if we actually got something
        setPhase(prev => {
          if (prev !== 'recording') return prev;
          // Use a microtask to read the latest transcript via setState callback
          return 'transcribed';
        });
      };

      recognitionRef.current = rec;
      rec.start();
      setPhase('recording');
    } catch (e) {
      setErrorMsg('לא הצלחנו להפעיל את המיקרופון.');
      setPhase('error');
    }
  };

  const stopRecording = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch (_) {}
    }
  };

  // Cleanup if user closes mid-recording
  React.useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try { rec.abort(); } catch (_) {}
      }
    };
  }, []);

  // ✓ שלח → Claude parse
  const handleSend = async () => {
    if (!transcript.trim()) return;
    if (!apiReady(state.apiConfig)) {
      toast('הגדר API בפרופיל לזיהוי תרגיל מהקול', { type: 'error' });
      return;
    }
    setPhase('parsing');
    try {
      const parsed = await parseWorkoutFromVoice(transcript, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({ type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          feature: 'workout_voice', costUSD: cost,
        });
      });
      // Always pass through to QuickLog — no silent saves, even on high confidence.
      // QuickLog still requires explicit "save" button click.
      onResult(parsed, transcript);
    } catch (e) {
      const msg = personaErrorFromException(state, e);
      toast(msg, { type: 'error' });
      setPhase('transcribed'); // back to review state
    }
  };

  // ✏️ ערוך → open QuickLog with no parse, just the raw text in customName
  const handleEdit = () => {
    onResult({ exerciseName: transcript }, transcript);
  };

  // 🎤 שוב → reset and re-record
  const handleRetry = () => {
    setTranscript('');
    setErrorMsg('');
    setPhase('idle');
    // Auto-start
    setTimeout(startRecording, 100);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 950,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(6px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 24, maxWidth: 380, width: '100%', direction: 'rtl', textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 2, marginBottom: 6 }}>
          קול
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
          {phase === 'idle'        && 'מה עשית?'}
          {phase === 'recording'   && 'מקשיב...'}
          {phase === 'transcribed' && 'שמעתי:'}
          {phase === 'parsing'     && 'מבין...'}
          {phase === 'error'       && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.rose }}>
              <TabIcon name="alert-circle" size={16} /><span>בעיה</span>
            </span>
          )}
        </div>

        {/* IDLE — start button */}
        {phase === 'idle' && (
          <>
            <button onClick={startRecording} style={micButton(T.lime, T.bg)} aria-label="התחל הקלטה">
              <TabIcon name="microphone" size={32} />
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: T.inkSub, lineHeight: 1.6 }}>
              לחץ והגד למשל:<br/>
              <span style={{ color: T.ink, fontFamily: T.mono }}>"שלושים שכיבות שמיכה"</span><br/>
              <span style={{ color: T.ink, fontFamily: T.mono }}>"הליכה חצי שעה"</span>
            </div>
          </>
        )}

        {/* RECORDING — animated waves + stop button */}
        {phase === 'recording' && (
          <>
            <_VoiceWaves />
            <button onClick={stopRecording} style={{
              marginTop: 18, padding: '12px 24px',
              background: T.rose, color: T.ink, border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700, fontFamily: T.font, cursor: 'pointer',
            }}>סיים</button>
            {transcript && (
              <div style={{ marginTop: 14, fontSize: 14, color: T.inkSub, fontStyle: 'italic', lineHeight: 1.5, minHeight: 40 }}>
                "{transcript}"
              </div>
            )}
          </>
        )}

        {/* TRANSCRIBED — show text + 3 buttons */}
        {phase === 'transcribed' && (
          <>
            <div style={{
              padding: 14, background: T.bg, borderRadius: 10,
              fontSize: 16, color: T.ink, lineHeight: 1.5, marginBottom: 16, fontWeight: 600,
            }}>
              {transcript || <span style={{ color: T.inkMute, fontWeight: 400 }}>לא שמעתי כלום</span>}
            </div>
            {transcript ? (
              <>
                <button onClick={handleSend} style={voiceActionBtn(T.lime, T.bg)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TabIcon name="check-circle" size={16} /><span>שלח לזיהוי</span>
                  </span>
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={handleEdit} style={voiceActionBtnSmall}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <TabIcon name="edit" size={12} /><span>ערוך ידנית</span>
                    </span>
                  </button>
                  <button onClick={handleRetry} style={voiceActionBtnSmall}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <TabIcon name="microphone" size={12} /><span>הקלט שוב</span>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleRetry} style={voiceActionBtn(T.lime, T.bg)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <TabIcon name="microphone" size={16} /><span>נסה שוב</span>
                </span>
              </button>
            )}
          </>
        )}

        {/* PARSING — loading state */}
        {phase === 'parsing' && (
          <>
            <div style={{
              padding: 14, background: T.bg, borderRadius: 10,
              fontSize: 14, color: T.ink, lineHeight: 1.5, marginBottom: 16, fontStyle: 'italic',
            }}>
              "{transcript}"
            </div>
            <SkeletonLines lines={2} />
          </>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <>
            <div style={{ fontSize: 13, color: T.rose, marginBottom: 16 }}>
              {errorMsg || 'שגיאה לא ידועה'}
            </div>
            <button onClick={handleRetry} style={voiceActionBtn(T.lime, T.bg)}>
              נסה שוב
            </button>
          </>
        )}

        {/* Close link */}
        {phase !== 'parsing' && (
          <button onClick={onClose} style={{
            marginTop: 14, background: 'transparent', border: 'none',
            color: T.inkMute, fontSize: 12, cursor: 'pointer', fontFamily: T.font,
          }}>ביטול</button>
        )}
      </div>
    </div>
  );
}

// Animated 5-bar voice waves while recording
function _VoiceWaves() {
  return (
    <>
      <style>{`
        @keyframes mk-voice-wave {
          0%, 100% { transform: scaleY(0.3); }
          50%      { transform: scaleY(1.0); }
        }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, height: 80, padding: 12,
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 8, height: 60, background: T.lime, borderRadius: 4,
            animation: `mk-voice-wave 0.9s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
          }} />
        ))}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// FreeTextInputDialog — same parser as voice, but typed instead of spoken
// ════════════════════════════════════════════════════════════════════
//
// Always available (no Web Speech requirement). Reuses parseWorkoutFromVoice
// since the model already accepts free-form Hebrew text — the prompt
// doesn't care whether it came from speech recognition or a keyboard.
function FreeTextInputDialog({ onClose, onResult }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [text, setText] = React.useState('');
  const [parsing, setParsing] = React.useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (!apiReady(state.apiConfig)) {
      toast('הגדר API בפרופיל לזיהוי תרגיל מהטקסט', { type: 'error' });
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseWorkoutFromVoice(text.trim(), state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({ type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          feature: 'workout_voice', costUSD: cost,
        });
      });
      onResult(parsed, text.trim());
    } catch (e) {
      toast(personaErrorFromException(state, e), { type: 'error' });
      setParsing(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 950,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(6px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 400, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 2, marginBottom: 6 }}>
          כתיבה
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
          תאר במילים מה עשית
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='למשל: "30 שכיבות שמיכה" או "ריצה חצי שעה" או "סקוואט 80 קילו 10 חזרות"'
          autoFocus
          rows={3}
          disabled={parsing}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            background: T.bg, border: `1px solid ${T.stroke}`, borderRadius: 10,
            color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right', resize: 'none',
          }}
        />

        {parsing ? (
          <div style={{ marginTop: 14 }}>
            <SkeletonLines lines={2} />
          </div>
        ) : (
          <>
            <div style={{ marginTop: 12, fontSize: 11, color: T.inkMute, lineHeight: 1.5 }}>
              המערכת תזהה תרגיל + חזרות + משקל ותמלא את הטופס. תוכל לבדוק לפני שמירה.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: 12, background: 'transparent', border: `1px solid ${T.stroke}`,
                borderRadius: 10, color: T.inkSub, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: T.font,
              }}>ביטול</button>
              <button onClick={handleSend} disabled={!text.trim()} style={{
                flex: 2, padding: 12,
                background: text.trim() ? T.lime : T.bgElev2,
                color: text.trim() ? T.bg : T.inkMute,
                border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 800, fontFamily: T.font,
                cursor: text.trim() ? 'pointer' : 'not-allowed',
              }}>שלח לזיהוי</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function micButton(bg, fg) {
  return {
    width: 110, height: 110, borderRadius: 55,
    background: bg, color: fg, border: 'none',
    fontSize: 48, cursor: 'pointer',
    boxShadow: `0 8px 32px ${T.lime}55`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
}
function voiceActionBtn(bg, fg) {
  return {
    width: '100%', padding: 14,
    background: bg, color: fg, border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 800, fontFamily: T.font, cursor: 'pointer',
  };
}
const voiceActionBtnSmall = {
  flex: 1, padding: 10,
  background: T.bgElev2, color: T.ink,
  border: `1px solid ${T.stroke}`, borderRadius: 10,
  fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer',
};
