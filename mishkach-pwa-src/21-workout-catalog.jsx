// ════════════════════════════════════════════════════════════════════
// 21-workout-catalog.jsx — Hebrew exercise catalog + workout helpers
// ════════════════════════════════════════════════════════════════════

const WORKOUT_TYPES = [
  { id: 'strength',  label: 'כוח',         icon: '🏋️', color: '#FFA500' },
  { id: 'cardio',    label: 'אירובי',      icon: '🏃', color: '#FF4458' },
  { id: 'hiit',      label: 'HIIT',        icon: '🔥', color: '#FFD700' },
  { id: 'flexibility', label: 'גמישות',    icon: '🧘', color: '#A8DEFF' },
  { id: 'sport',     label: 'ספורט',       icon: '⚽', color: '#7FFF7F' },
  { id: 'walking',   label: 'הליכה',       icon: '🚶', color: '#94FF66' },
  { id: 'other',     label: 'אחר',         icon: '💪', color: '#999999' },
];

const MUSCLE_GROUPS = [
  { id: 'chest',    label: 'חזה' },
  { id: 'back',     label: 'גב' },
  { id: 'legs',     label: 'רגליים' },
  { id: 'shoulders', label: 'כתפיים' },
  { id: 'arms',     label: 'ידיים' },
  { id: 'core',     label: 'בטן' },
  { id: 'glutes',   label: 'ישבן' },
  { id: 'cardio',   label: 'לב-ריאות' },
  { id: 'full',     label: 'כל הגוף' },
];

// Common Hebrew exercises grouped — each has: id, name, muscle, category, hasWeight
// hasWeight=true means user logs weight per set (kg). false = bodyweight or duration only.
const EXERCISE_CATALOG = [
  // ─── Chest ──────────────────────────────
  { id: 'bench_press',     name: 'לחיצת חזה',           muscle: 'chest',    category: 'strength', hasWeight: true },
  { id: 'incline_bench',   name: 'לחיצת חזה משופע',     muscle: 'chest',    category: 'strength', hasWeight: true },
  { id: 'dumbbell_fly',    name: 'פתיחות חזה',          muscle: 'chest',    category: 'strength', hasWeight: true },
  { id: 'pushup',          name: 'שכיבות סמיכה',        muscle: 'chest',    category: 'strength', hasWeight: false },
  { id: 'dips',            name: 'דיפס (מקבילים)',      muscle: 'chest',    category: 'strength', hasWeight: false },

  // ─── Back ───────────────────────────────
  { id: 'pullup',          name: 'מתח',                 muscle: 'back',     category: 'strength', hasWeight: false },
  { id: 'lat_pulldown',    name: 'משיכת פולי עליון',     muscle: 'back',     category: 'strength', hasWeight: true },
  { id: 'barbell_row',     name: 'חתירה במוט',          muscle: 'back',     category: 'strength', hasWeight: true },
  { id: 'cable_row',       name: 'חתירה במכונה',         muscle: 'back',     category: 'strength', hasWeight: true },
  { id: 'deadlift',        name: 'דדליפט',              muscle: 'back',     category: 'strength', hasWeight: true },

  // ─── Legs ───────────────────────────────
  { id: 'squat',           name: 'סקוואט (מוט)',        muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'leg_press',       name: 'לחיצת רגליים',        muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'lunges',          name: 'מספריים',             muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'leg_extension',   name: 'יישור ברך',           muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'leg_curl',        name: 'כפיפת ברך',           muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'calf_raise',      name: 'הרמות שוק',           muscle: 'legs',     category: 'strength', hasWeight: true },
  { id: 'bodyweight_squat', name: 'סקוואט משקל גוף',    muscle: 'legs',     category: 'strength', hasWeight: false },

  // ─── Shoulders ──────────────────────────
  { id: 'shoulder_press',  name: 'לחיצת כתפיים',         muscle: 'shoulders', category: 'strength', hasWeight: true },
  { id: 'lateral_raise',   name: 'הרחקת זרועות',         muscle: 'shoulders', category: 'strength', hasWeight: true },
  { id: 'face_pull',       name: 'משיכת פנים',           muscle: 'shoulders', category: 'strength', hasWeight: true },

  // ─── Arms ───────────────────────────────
  { id: 'biceps_curl',     name: 'יד דו ראשי (כפיפה)',   muscle: 'arms',     category: 'strength', hasWeight: true },
  { id: 'hammer_curl',     name: 'הרמות פטיש',           muscle: 'arms',     category: 'strength', hasWeight: true },
  { id: 'triceps_pushdown', name: 'יד תלת ראשי (כבל)',   muscle: 'arms',     category: 'strength', hasWeight: true },
  { id: 'triceps_dips',    name: 'יד תלת ראשי (דיפ)',    muscle: 'arms',     category: 'strength', hasWeight: false },

  // ─── Core ───────────────────────────────
  { id: 'plank',           name: 'פלאנק',                muscle: 'core',     category: 'strength', hasWeight: false, isDuration: true },
  { id: 'situps',          name: 'בטן (סיט-אפים)',       muscle: 'core',     category: 'strength', hasWeight: false },
  { id: 'crunches',        name: 'קראנצ׳',               muscle: 'core',     category: 'strength', hasWeight: false },
  { id: 'leg_raises',      name: 'הרמות רגליים',          muscle: 'core',     category: 'strength', hasWeight: false },
  { id: 'russian_twist',   name: 'טוויסט רוסי',          muscle: 'core',     category: 'strength', hasWeight: false },

  // ─── Glutes ─────────────────────────────
  { id: 'hip_thrust',      name: 'הרמות אגן',            muscle: 'glutes',   category: 'strength', hasWeight: true },
  { id: 'glute_bridge',    name: 'גשר ישבן',             muscle: 'glutes',   category: 'strength', hasWeight: false },

  // ─── Cardio ─────────────────────────────
  { id: 'running',         name: 'ריצה',                 muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'walking',         name: 'הליכה',                muscle: 'cardio',   category: 'walking',  hasWeight: false, isDuration: true },
  { id: 'cycling',         name: 'אופניים',              muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'rowing',          name: 'חתירה',                muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'elliptical',      name: 'אליפטיקל',             muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'jumping_rope',    name: 'דילוג חבל',            muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'swimming',        name: 'שחייה',                muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },
  { id: 'stairs',          name: 'מדרגות',               muscle: 'cardio',   category: 'cardio',   hasWeight: false, isDuration: true },

  // ─── Flexibility ────────────────────────
  { id: 'stretching',      name: 'מתיחות',               muscle: 'full',     category: 'flexibility', hasWeight: false, isDuration: true },
  { id: 'yoga',            name: 'יוגה',                 muscle: 'full',     category: 'flexibility', hasWeight: false, isDuration: true },
  { id: 'pilates',         name: 'פילאטיס',              muscle: 'full',     category: 'flexibility', hasWeight: false, isDuration: true },

  // ─── Sport ──────────────────────────────
  { id: 'football',        name: 'כדורגל',               muscle: 'cardio',   category: 'sport',    hasWeight: false, isDuration: true },
  { id: 'basketball',      name: 'כדורסל',               muscle: 'cardio',   category: 'sport',    hasWeight: false, isDuration: true },
  { id: 'tennis',          name: 'טניס',                 muscle: 'cardio',   category: 'sport',    hasWeight: false, isDuration: true },
];

// Build a map for O(1) lookup
const EXERCISE_BY_ID = {};
EXERCISE_CATALOG.forEach(e => { EXERCISE_BY_ID[e.id] = e; });

// Get exercises filtered by muscle group
function exercisesByMuscle(muscleId) {
  return EXERCISE_CATALOG.filter(e => e.muscle === muscleId);
}

function getExercise(id) {
  return EXERCISE_BY_ID[id] || null;
}

function getWorkoutType(id) {
  return WORKOUT_TYPES.find(t => t.id === id) || WORKOUT_TYPES[WORKOUT_TYPES.length - 1];
}

function getMuscleGroup(id) {
  return MUSCLE_GROUPS.find(m => m.id === id) || null;
}

// ─── Stats helpers ─────────────────────────────────────────────────

// Count workouts in last N days
function workoutCountLastDays(sessions, days = 7) {
  const cutoff = addDaysISO(todayISO(), -days);
  let count = 0;
  Object.keys(sessions).forEach(date => {
    if (date >= cutoff && date <= todayISO()) {
      count += (sessions[date] || []).length;
    }
  });
  return count;
}

// Total minutes in last N days
function workoutMinutesLastDays(sessions, days = 7) {
  const cutoff = addDaysISO(todayISO(), -days);
  let total = 0;
  Object.keys(sessions).forEach(date => {
    if (date >= cutoff && date <= todayISO()) {
      (sessions[date] || []).forEach(w => {
        total += (w.durationMin || 0);
      });
    }
  });
  return total;
}

// Workout streak — consecutive days (ending today or yesterday) with at least 1 workout
function workoutStreak(sessions) {
  let streak = 0;
  let day = todayISO();
  // allow a 1-day grace
  if (!sessions[day] || sessions[day].length === 0) {
    day = addDaysISO(day, -1);
  }
  while (sessions[day] && sessions[day].length > 0) {
    streak++;
    day = addDaysISO(day, -1);
    if (streak > 365) break; // safety
  }
  return streak;
}

// Calculate total volume for a workout (sum of weight * reps across all sets)
function workoutVolume(workout) {
  let total = 0;
  (workout.exercises || []).forEach(ex => {
    (ex.sets || []).forEach(s => {
      total += (s.weight || 0) * (s.reps || 0);
    });
  });
  return Math.round(total);
}

// Format minutes nicely: 95 → "1ש' 35ד'"
function fmtMinutes(min) {
  if (!min || min === 0) return '0ד׳';
  if (min < 60) return `${min}ד׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}ש׳` : `${h}ש׳ ${m}ד׳`;
}

// ─── Weekly volume buckets (last `weeks` weeks ending today) ────────
// Returns [{ weekIdx, label, volume }] oldest→newest, length === weeks.
function weeklyVolumeBuckets(sessions, weeks = 4) {
  const today = todayISO();
  const buckets = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDaysISO(today, -7 * w);
    const start = addDaysISO(end, -6);
    let vol = 0;
    Object.keys(sessions).forEach(date => {
      if (date < start || date > end) return;
      (sessions[date] || []).forEach(workout => {
        vol += workoutVolume(workout);
      });
    });
    const label = w === 0 ? 'השבוע' : w === 1 ? 'שעבר' : `לפני ${w} שב׳`;
    buckets.push({ weekIdx: w, label, volume: vol, start, end });
  }
  return buckets;
}

// ─── Frequency by workout type (last `days` days) ───────────────────
// Returns [{ id, label, color, count }] sorted by count desc, only types with count > 0.
function workoutFrequencyByType(sessions, days = 30) {
  const cutoff = addDaysISO(todayISO(), -(days - 1));
  const today = todayISO();
  const counts = {};
  Object.keys(sessions).forEach(date => {
    if (date < cutoff || date > today) return;
    (sessions[date] || []).forEach(w => {
      const id = w.type || 'other';
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return WORKOUT_TYPES
    .map(t => ({ id: t.id, label: t.label, color: t.color, count: counts[t.id] || 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ─── Personal Records ───────────────────────────────────────────────
// Walk every workout, group sets by exerciseId (or normalized name for
// custom exercises), and compute per-exercise records:
//   - maxWeight: heaviest single set { weight, reps, date }
//   - maxReps:   most reps in a single set { reps, weight, date }
//   - maxVolume: max sum(weight*reps) for that exercise within ONE workout { volume, date }
// Only exercises with >= MIN_OCCURRENCES distinct workout sessions get a PR
// (avoids "first time = PR" noise).
const PR_MIN_OCCURRENCES = 3;

function _exerciseKey(ex) {
  // Catalog exercises share id; custom exercises share normalized name
  return ex.exerciseId || `custom::${(ex.name || '').trim().toLowerCase()}`;
}

// Build PR map from sessions, optionally excluding workouts on a given date+id
// (so we can ask "what would the PRs be WITHOUT this workout").
function computePRsByExercise(sessions, exclude = null) {
  // Per-exercise aggregation
  const byEx = {}; // key -> { name, isDuration, hasWeight, occurrences:Set<date>, sets:[{weight,reps,date,volume}] }

  Object.entries(sessions).forEach(([date, dayList]) => {
    (dayList || []).forEach(workout => {
      if (exclude && exclude.date === date && exclude.workoutId === workout.id) return;
      (workout.exercises || []).forEach(ex => {
        if (ex.isDuration) return; // PRs don't apply to time-based exercises
        const key = _exerciseKey(ex);
        if (!byEx[key]) {
          byEx[key] = {
            key,
            name: ex.name,
            hasWeight: ex.hasWeight !== false,
            occurrences: new Set(),
            sets: [],
            sessionVolumes: [], // {volume, date}
          };
        }
        byEx[key].occurrences.add(`${date}::${workout.id}`);
        let sessionVol = 0;
        (ex.sets || []).forEach(s => {
          const reps = s.reps || 0;
          const weight = s.weight || 0;
          if (reps === 0) return;
          byEx[key].sets.push({ weight, reps, date, volume: weight * reps });
          sessionVol += weight * reps;
        });
        if (sessionVol > 0) byEx[key].sessionVolumes.push({ volume: sessionVol, date });
      });
    });
  });

  // Reduce to records — only for exercises with enough occurrences
  const prs = {};
  Object.values(byEx).forEach(agg => {
    if (agg.occurrences.size < PR_MIN_OCCURRENCES) return;
    if (agg.sets.length === 0) return;

    let maxW = null, maxR = null, maxV = null;
    agg.sets.forEach(s => {
      if (agg.hasWeight && (maxW === null || s.weight > maxW.weight)) {
        maxW = { weight: s.weight, reps: s.reps, date: s.date };
      }
      if (maxR === null || s.reps > maxR.reps) {
        maxR = { reps: s.reps, weight: s.weight, date: s.date };
      }
    });
    agg.sessionVolumes.forEach(v => {
      if (maxV === null || v.volume > maxV.volume) {
        maxV = { volume: Math.round(v.volume), date: v.date };
      }
    });

    prs[agg.key] = {
      key: agg.key,
      name: agg.name,
      hasWeight: agg.hasWeight,
      occurrences: agg.occurrences.size,
      maxWeight: maxW,
      maxReps: maxR,
      maxVolume: (maxV && maxV.volume > 0) ? maxV : null,
    };
  });

  return prs;
}

// Given a single workout, return PRs that THIS workout broke versus the
// rest of history. Returns [{ exerciseName, kinds: [{kind, value, prevValue}] }].
// kind: 'weight' | 'reps' | 'volume'
function findNewPRs(sessions, date, workout) {
  if (!workout || !(workout.exercises || []).length) return [];
  const prevPRs = computePRsByExercise(sessions, { date, workoutId: workout.id });
  const broken = [];

  workout.exercises.forEach(ex => {
    if (ex.isDuration) return;
    const key = _exerciseKey(ex);
    const prev = prevPRs[key];
    // Need a baseline: the exercise must already have history (>= MIN occurrences)
    if (!prev) return;

    let bestSet = null;        // heaviest single set in this workout
    let mostReps = null;
    let sessionVol = 0;
    (ex.sets || []).forEach(s => {
      const reps = s.reps || 0;
      const weight = s.weight || 0;
      if (reps === 0) return;
      sessionVol += weight * reps;
      if (ex.hasWeight !== false && (bestSet === null || weight > bestSet.weight)) {
        bestSet = { weight, reps };
      }
      if (mostReps === null || reps > mostReps.reps) {
        mostReps = { reps, weight };
      }
    });

    const kinds = [];
    if (prev.maxWeight && bestSet && bestSet.weight > prev.maxWeight.weight) {
      kinds.push({ kind: 'weight', value: bestSet.weight, prevValue: prev.maxWeight.weight });
    }
    if (prev.maxReps && mostReps && mostReps.reps > prev.maxReps.reps) {
      kinds.push({ kind: 'reps', value: mostReps.reps, prevValue: prev.maxReps.reps });
    }
    if (prev.maxVolume && sessionVol > prev.maxVolume.volume) {
      kinds.push({ kind: 'volume', value: Math.round(sessionVol), prevValue: prev.maxVolume.volume });
    }
    if (kinds.length) broken.push({ exerciseName: ex.name, kinds });
  });

  return broken;
}
