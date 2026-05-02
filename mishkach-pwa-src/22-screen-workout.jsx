// ════════════════════════════════════════════════════════════════════
// 22-screen-workout.jsx — Workout main screen + dialogs
// ════════════════════════════════════════════════════════════════════

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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>WORKOUT</div>
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
            <div style={{ fontSize: 36, marginBottom: 8 }}>💪</div>
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
    </div>
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
        background: `${type.color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{type.icon}</div>
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>NEW WORKOUT · אימון חדש</div>
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
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
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
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>EXERCISES · תרגילים</div>
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
          <div style={{ fontSize: 24 }}>{t.icon}</div>
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
          }}>
            🔄 חשב אוטומטית · ~{fmtMinutes(autoDurationMin)}
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
            <div style={{ fontSize: 28 }}>{t.icon}</div>
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
        <div style={{ fontSize: 22 }}>🏆</div>
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>RECORDS · שיאים</div>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="trophy" size={16} color={T.amber} /> שיאים אישיים
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '60px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.6 }}>🏋️</div>
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>SEARCH · חיפוש</div>
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
                  <div style={{ fontSize: 10, color: tp.color, fontFamily: T.mono, letterSpacing: 0.5 }}>
                    {tp.icon} {tp.label}
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>ROUTINES · רוטינות</div>
          <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="clipboard-list" size={16} color={T.cyan} /> הרוטינות שלי
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '60px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.6 }}>📋</div>
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
          background: `${tp.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{tp.icon}</div>
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
          padding: 6, fontSize: 16,
        }}>🗑</button>
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
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>QUICK LOG</div>
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
          VOICE · קול
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
          {phase === 'idle'        && 'מה עשית?'}
          {phase === 'recording'   && 'מקשיב...'}
          {phase === 'transcribed' && 'שמעתי:'}
          {phase === 'parsing'     && 'מבין...'}
          {phase === 'error'       && '🚫 בעיה'}
        </div>

        {/* IDLE — start button */}
        {phase === 'idle' && (
          <>
            <button onClick={startRecording} style={micButton(T.lime, T.bg)}>🎤</button>
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
                  ✓ שלח לזיהוי
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={handleEdit} style={voiceActionBtnSmall}>
                    ✏️ ערוך ידנית
                  </button>
                  <button onClick={handleRetry} style={voiceActionBtnSmall}>
                    🎤 הקלט שוב
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleRetry} style={voiceActionBtn(T.lime, T.bg)}>
                🎤 נסה שוב
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
          TEXT · כתיבה
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
              ה-AI יזהה תרגיל + חזרות + משקל וימלא את הטופס. תוכל לבדוק לפני שמירה.
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
