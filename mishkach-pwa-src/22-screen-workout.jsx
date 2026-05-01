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

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>WORKOUT</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>אימון · {fmt.relativeDay(dateViewing)}</div>
        </div>
        <button onClick={() => setShowPRs(true)} aria-label="שיאים אישיים" style={{
          width: 34, height: 34, borderRadius: 17, background: T.bgElev,
          border: `1px solid ${T.stroke}`, color: T.amber, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, padding: 0,
        }}>🏆</button>
        {streak >= 2 && (
          <div style={{
            padding: '4px 10px', background: `${T.amber}20`, border: `1px solid ${T.amber}55`,
            borderRadius: 999, fontSize: 11, color: T.amber, fontFamily: T.mono, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <TabIcon name="flame" size={12} />
            {streak} ימים
          </div>
        )}
      </div>

      {/* Day navigator */}
      <div style={{ padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setDateViewing(d => addDaysISO(d, -1))} style={navBtn}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: T.mono, color: T.inkSub }}>{fmt.day(dateViewing)}</div>
        <button onClick={() => setDateViewing(d => addDaysISO(d, 1))} disabled={dateViewing >= todayISO()} style={{ ...navBtn, opacity: dateViewing >= todayISO() ? 0.3 : 1 }}>›</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 20px' }}>
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

        {/* Add button */}
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => setNewOpen(true)}>+ אימון חדש</Button>
        </div>
      </div>

      {newOpen && <NewWorkoutDialog date={dateViewing} onClose={() => setNewOpen(false)} />}
      {editing && <WorkoutDetailDialog date={editing.date} workout={editing.workout} onClose={() => setEditing(null)} />}
      {showPRs && <PersonalRecordsScreen onClose={() => setShowPRs(false)} />}
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
function NewWorkoutDialog({ date, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [step, setStep] = React.useState(0); // 0=type, 1=exercises, 2=review
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('strength');
  const [duration, setDuration] = React.useState(30);
  const [notes, setNotes] = React.useState('');
  const [exercises, setExercises] = React.useState([]); // [{ exerciseId, name, sets, notes }]
  const [pickerOpen, setPickerOpen] = React.useState(false);

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
    const finalName = name.trim() || getWorkoutType(type).label;
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
        <button onClick={onClose} style={{
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

            <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>שם (אופציונלי)</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="למשל: רגליים + ישבן"
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
function ReviewWorkout({ name, type, duration, notes, exercises }) {
  const t = getWorkoutType(type);
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  return (
    <div>
      <Card padding={14} style={{ marginBottom: 12, background: `${t.color}10`, border: `1px solid ${t.color}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 24 }}>{t.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{name.trim() || t.label}</div>
            <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono }}>
              {t.label} · {fmtMinutes(duration)} · {exercises.length} תרגילים · {totalSets} סטים
            </div>
          </div>
        </div>
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

  const t = getWorkoutType(workout.type || 'other');
  const totalSets = (workout.exercises || []).reduce((s, e) => s + (e.sets?.length || 0), 0);
  const volume = workoutVolume(workout);
  const sessions = state.workouts?.sessions || {};
  const newPRs = React.useMemo(
    () => findNewPRs(sessions, date, workout),
    [sessions, date, workout]
  );

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

        {/* Delete button */}
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setConfirmDelete(true)} style={{
            width: '100%', padding: 14, background: 'transparent', border: `1px solid ${T.rose}55`,
            borderRadius: 10, color: T.rose, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
          }}>מחק אימון</button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="למחוק את האימון?"
        message="פעולה זו תסיר את האימון לצמיתות."
        confirmLabel="מחק"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
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
          <div style={{ fontSize: 17, fontWeight: 700 }}>🏆 שיאים אישיים</div>
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
