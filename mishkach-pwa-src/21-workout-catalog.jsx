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
