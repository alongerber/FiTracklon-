// ════════════════════════════════════════════════════════════════════
// 02-store.jsx — State, reducer, persistence, stats computation
// ════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mishkach.v1.data';
const STATE_VERSION = 1;

const initialState = {
  version: STATE_VERSION,
  user: {
    name: '',
    heightCm: 175,
    ageYears: 35,
    gender: 'male',      // 'male' | 'female'
    startWeight: null,   // kg
    startDate: null,     // YYYY-MM-DD
  },
  goal: {
    weight: null,        // kg
    pace: 'balanced',    // 'slow' | 'balanced' | 'aggressive'
  },
  // entries: { 'YYYY-MM-DD': { weight: kg, time: 'HH:mm', note: string, createdAt: iso } }
  entries: {},
  // mood removed from initialState in v3.6 — feature was retired (low utility).
  // The SET_MOOD/DELETE_MOOD reducer cases + loadState merge are kept dormant
  // so existing user data isn't lost if we revisit. New users get no `mood` key.
  // nutrition: goals + meals + favorites keyed by date
  nutrition: {
    goals: {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      source: 'auto',
    },
    // meals: { 'YYYY-MM-DD': [ { id, time, description, calories, protein, carbs, fat, source, thumbnail?, aiNotes?, items?, createdAt } ] }
    meals: {},
    // favorites: { favoriteId: { description, calories, protein, carbs, fat, useCount, lastUsed, thumbnail? } }
    // Keyed by normalized description; auto-populated from saved meals
    favorites: {},
  },
  // workouts: keyed by date for fast lookup
  workouts: {
    // 'YYYY-MM-DD': [ { id, time, name, type, durationMin, notes, exercises: [{exerciseId, name, sets: [{reps, weight, restSec}], notes}], createdAt } ]
    sessions: {},
    // routines: saved templates the user can repeat
    routines: {}, // { routineId: { name, exercises: [{exerciseId, defaultSets, defaultReps}], lastUsed, useCount } }
  },
  // תובנות AI config — supports both BYO key (direct) and shared password (proxy)
  apiConfig: {
    mode: 'direct',        // 'direct' (BYO API key) | 'shared' (proxy + password)
    key: '',               // personal Anthropic API key
    sharedPassword: '',    // password for shared proxy
    model: 'claude-opus-4-7',
    enabled: true,
  },
  // Usage tracking
  usage: {
    allTime: { requests: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 },
    byMonth: {},         // { 'YYYY-MM': { requests, inputTokens, outputTokens, costUSD } }
    byFeature: {},       // { 'nutrition_text': {count, cost}, ... }
  },
  // Cached insights (so user doesn't pay twice)
  insights: {
    weekly: null,        // { text, generatedAt, weekEnding }
    plateau: null,       // { text, generatedAt, periodDays }
    calibration: null,   // { text, generatedAt }
    correlations: null,  // { items: [{pattern, support, action}], generatedAt }
  },
  settings: {
    unit: 'kg',
    homeVariant: 'v1',
    firstLaunch: true,
    persona: null,        // polish_mom | salesman | cynic_coach | jealous_friend | neutral
    tipsShown: [],        // tip ids user has seen
    // Celebration milestones — store the date they fired so we don't repeat
    goalReachedAt: null,  // YYYY-MM-DD — when user first crossed goal
    lastLowWeight: null,  // kg — lowest weight recorded so far
    personaInteractions: 0, // counter for "moment of sincerity"
    notifications: {
      enabled: false,
      weighTime: '08:00',
      pushSubscription: null,
    },
    // Optional separate reminder for workout days. days = JS Date.getDay() (0=Sun..6=Sat).
    // Independent from `notifications` (which is the weigh-in reminder); both can be on at once.
    workoutReminder: {
      enabled: false,
      days: [],            // e.g. [0, 2, 4] = Sun/Tue/Thu
      time: '17:00',
    },
    // Dismissed UI surfaces — single-shot dismissals tracked by their natural key.
    dismissedDayBanner: null,     // YYYY-MM-DD — date the user closed the day banner
    dismissedMonthlyRecap: null,  // YYYY-MM — month whose recap was acknowledged
    // v3.11 boot flow
    splashSeenToday: null,        // YYYY-MM-DD — splash plays once per day
    installDeclined: 0,           // count of "ignore" presses on install prompt;
                                  // suppress prompt after 3 declines (give up)
    // Last-used preferences for the personal report generator.
    // Pre-populated as smart defaults next time the user opens the report flow.
    reportPrefs: {
      recipient: 'self',          // 'self' | 'doctor' | 'trainer' | 'friend' | 'other'
      customRecipient: '',        // free-text, used when recipient === 'other'
      period: 'month',            // 'week' | 'month' | 'quarter' | 'all' | 'custom'
      customFromDate: null,       // YYYY-MM-DD, used when period === 'custom'
      customToDate: null,
      includes: {
        weight: true,
        nutrition: true,
        workouts: true,
        ai_insights: true,
        notes: false,             // off by default; auto-on when recipient === 'self'
      },
    },
  },
  meta: {
    createdAt: null,
    updatedAt: null,
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    // Basic migration: if version mismatch, try merging over initialState
    if (parsed.version !== STATE_VERSION) {
      return { ...initialState, ...parsed, version: STATE_VERSION };
    }
    // Deep merge for safety
    return {
      ...initialState,
      ...parsed,
      user: { ...initialState.user, ...(parsed.user || {}) },
      goal: { ...initialState.goal, ...(parsed.goal || {}) },
      settings: { ...initialState.settings, ...(parsed.settings || {}) },
      entries: parsed.entries || {},
      // v3.6: mood feature removed from UI but data preserved if previously saved.
      // Migration-safe: missing key on old states is fine.
      mood: parsed.mood || {},
      nutrition: {
        ...initialState.nutrition,
        ...(parsed.nutrition || {}),
        goals: { ...initialState.nutrition.goals, ...((parsed.nutrition || {}).goals || {}) },
        meals: (parsed.nutrition || {}).meals || {},
        favorites: (parsed.nutrition || {}).favorites || {},
      },
      workouts: {
        ...initialState.workouts,
        ...(parsed.workouts || {}),
        sessions: (parsed.workouts || {}).sessions || {},
        routines: (parsed.workouts || {}).routines || {},
      },
      apiConfig: { ...initialState.apiConfig, ...(parsed.apiConfig || {}) },
      usage: {
        ...initialState.usage,
        ...(parsed.usage || {}),
        allTime: { ...initialState.usage.allTime, ...((parsed.usage || {}).allTime || {}) },
        byMonth: (parsed.usage || {}).byMonth || {},
        byFeature: (parsed.usage || {}).byFeature || {},
      },
      insights: { ...initialState.insights, ...(parsed.insights || {}) },
      meta: { ...initialState.meta, ...(parsed.meta || {}) },
    };
  } catch (e) {
    console.warn('loadState failed, resetting:', e);
    return initialState;
  }
}

function saveState(state) {
  try {
    const toSave = { ...state, meta: { ...state.meta, updatedAt: new Date().toISOString() } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('saveState failed:', e);
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: { ...state.user, ...action.user } };
    case 'SET_GOAL':
      return { ...state, goal: { ...state.goal, ...action.goal } };
    case 'UPSERT_ENTRY': {
      const { date, weight, time, note } = action;
      return {
        ...state,
        entries: {
          ...state.entries,
          [date]: {
            weight,
            time: time || nowHHMM(),
            note: note || '',
            createdAt: state.entries[date]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
    case 'DELETE_ENTRY': {
      const { [action.date]: _, ...rest } = state.entries;
      return { ...state, entries: rest };
    }

    // ─── Mood / energy / sleep daily self-report ────────────────────
    case 'SET_MOOD': {
      // action: { date, mood, energy, sleep, note }
      // Stores all four on one key — overwrites if it already exists for that day.
      const { date, mood: m, energy, sleep, note } = action;
      return {
        ...state,
        mood: {
          ...state.mood,
          [date]: {
            mood: m, energy, sleep,
            note: note || '',
            createdAt: state.mood[date]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
    case 'DELETE_MOOD': {
      const { [action.date]: _, ...rest } = state.mood;
      return { ...state, mood: rest };
    }

    // ─── Nutrition ──────────────────────────────────────────────
    case 'SET_NUTRITION_GOALS':
      return {
        ...state,
        nutrition: {
          ...state.nutrition,
          goals: { ...state.nutrition.goals, ...action.goals },
        },
      };
    case 'ADD_MEAL': {
      const { date, meal } = action;
      const existing = state.nutrition.meals[date] || [];
      const newMeal = { ...meal, id: meal.id || uid(), createdAt: new Date().toISOString() };

      // Track as favorite (normalized description key)
      const favKey = (meal.description || '').trim().toLowerCase();
      const favs = { ...state.nutrition.favorites };
      if (favKey) {
        const prev = favs[favKey];
        favs[favKey] = {
          description: meal.description.trim(),
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          thumbnail: meal.thumbnail || prev?.thumbnail || null,
          useCount: (prev?.useCount || 0) + 1,
          lastUsed: new Date().toISOString(),
          firstUsed: prev?.firstUsed || new Date().toISOString(),
        };
      }

      return {
        ...state,
        nutrition: {
          ...state.nutrition,
          meals: {
            ...state.nutrition.meals,
            [date]: [...existing, newMeal],
          },
          favorites: favs,
        },
      };
    }
    case 'UPDATE_MEAL': {
      const { date, mealId, updates } = action;
      const existing = state.nutrition.meals[date] || [];
      return {
        ...state,
        nutrition: {
          ...state.nutrition,
          meals: {
            ...state.nutrition.meals,
            [date]: existing.map(m => m.id === mealId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m),
          },
        },
      };
    }
    case 'REMOVE_FAVORITE': {
      const favs = { ...state.nutrition.favorites };
      delete favs[action.favKey];
      return { ...state, nutrition: { ...state.nutrition, favorites: favs } };
    }
    case 'RESTORE_FAVORITE': {
      // For undo: re-insert a previously removed favorite
      return {
        ...state,
        nutrition: {
          ...state.nutrition,
          favorites: { ...state.nutrition.favorites, [action.favKey]: action.fav },
        },
      };
    }
    case 'DELETE_MEAL': {
      const { date, mealId } = action;
      const existing = state.nutrition.meals[date] || [];
      const filtered = existing.filter(m => m.id !== mealId);
      const newMeals = { ...state.nutrition.meals };
      if (filtered.length === 0) delete newMeals[date];
      else newMeals[date] = filtered;
      return { ...state, nutrition: { ...state.nutrition, meals: newMeals } };
    }

    // ─── API config ─────────────────────────────────────────────
    case 'SET_API_KEY':
      return { ...state, apiConfig: { ...state.apiConfig, key: action.key || '' } };
    case 'SET_API_MODE':
      return { ...state, apiConfig: { ...state.apiConfig, mode: action.mode === 'shared' ? 'shared' : 'direct' } };
    case 'SET_SHARED_PASSWORD':
      return { ...state, apiConfig: { ...state.apiConfig, sharedPassword: action.password || '' } };
    case 'SET_API_ENABLED':
      return { ...state, apiConfig: { ...state.apiConfig, enabled: !!action.enabled } };

    // ─── Usage tracking ─────────────────────────────────────────
    case 'TRACK_USAGE': {
      const { inputTokens, outputTokens, feature, costUSD } = action;
      const month = todayISO().slice(0, 7); // YYYY-MM
      const at = state.usage.allTime;
      const bm = state.usage.byMonth[month] || { requests: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
      const bf = state.usage.byFeature[feature] || { count: 0, costUSD: 0 };
      return {
        ...state,
        usage: {
          allTime: {
            requests:     at.requests + 1,
            inputTokens:  at.inputTokens + inputTokens,
            outputTokens: at.outputTokens + outputTokens,
            costUSD:      at.costUSD + costUSD,
          },
          byMonth: {
            ...state.usage.byMonth,
            [month]: {
              requests:     bm.requests + 1,
              inputTokens:  bm.inputTokens + inputTokens,
              outputTokens: bm.outputTokens + outputTokens,
              costUSD:      bm.costUSD + costUSD,
            },
          },
          byFeature: {
            ...state.usage.byFeature,
            [feature]: { count: bf.count + 1, costUSD: bf.costUSD + costUSD },
          },
        },
      };
    }

    // ─── Insights ───────────────────────────────────────────────
    case 'SET_INSIGHT':
      return { ...state, insights: { ...state.insights, [action.kind]: action.payload } };
    case 'CLEAR_INSIGHT':
      return { ...state, insights: { ...state.insights, [action.kind]: null } };

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case 'INCREMENT_PERSONA_INTERACTIONS':
      return {
        ...state,
        settings: {
          ...state.settings,
          personaInteractions: (state.settings.personaInteractions || 0) + 1,
        },
      };
    // ─── Undo support: stash a deleted thing temporarily ─────────────
    case 'STASH_DELETION':
      return {
        ...state,
        tempUndo: {
          kind: action.kind,             // 'weight' | 'meal' | 'favorite'
          payload: action.payload,
          deletedAt: Date.now(),
        },
      };
    case 'CLEAR_UNDO':
      return { ...state, tempUndo: null };
    case 'SET_PERSONA':
      return { ...state, settings: { ...state.settings, persona: action.persona } };
    case 'MARK_TIP_SHOWN': {
      const shown = state.settings.tipsShown || [];
      if (shown.includes(action.tipId)) return state;
      return { ...state, settings: { ...state.settings, tipsShown: [...shown, action.tipId] } };
    }
    case 'RESET_TIPS_SHOWN':
      return { ...state, settings: { ...state.settings, tipsShown: [] } };
    case 'SET_NOTIFICATIONS':
      return { ...state, settings: { ...state.settings, notifications: { ...state.settings.notifications, ...action.updates } } };
    case 'UPDATE_WEIGHT_ENTRY': {
      const { date, updates } = action;
      if (!state.entries[date]) return state;
      return {
        ...state,
        entries: {
          ...state.entries,
          [date]: { ...state.entries[date], ...updates, updatedAt: new Date().toISOString() },
        },
      };
    }
    case 'COMPLETE_ONBOARDING': {
      const today = todayISO();
      return {
        ...state,
        user: {
          ...state.user,
          name: action.name,
          heightCm: action.heightCm,
          ageYears: action.ageYears || state.user.ageYears,
          gender: action.gender || state.user.gender,
          startWeight: action.currentWeight,
          startDate: today,
        },
        goal: { ...state.goal, weight: action.goalWeight, pace: action.pace || 'balanced' },
        entries: {
          ...state.entries,
          [today]: {
            weight: action.currentWeight,
            time: nowHHMM(),
            note: '',
            createdAt: new Date().toISOString(),
          },
        },
        settings: { ...state.settings, firstLaunch: false, unit: action.unit || 'kg' },
        meta: { createdAt: state.meta.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() },
      };
    }
    case 'RESET_ALL':
      return initialState;
    case 'IMPORT_STATE':
      return { ...initialState, ...action.state, version: STATE_VERSION };

    // ─── Workout actions ────────────────────────────────────────────
    case 'ADD_WORKOUT': {
      const { date, workout } = action;
      const sessions = { ...state.workouts.sessions };
      const dayList = sessions[date] || [];
      const newWorkout = {
        ...workout,
        id: workout.id || uid(),
        createdAt: new Date().toISOString(),
      };
      sessions[date] = [...dayList, newWorkout];
      return { ...state, workouts: { ...state.workouts, sessions } };
    }
    case 'UPDATE_WORKOUT': {
      const { date, workoutId, updates } = action;
      const sessions = { ...state.workouts.sessions };
      const dayList = sessions[date] || [];
      sessions[date] = dayList.map(w =>
        w.id === workoutId
          ? { ...w, ...updates, updatedAt: new Date().toISOString() }
          : w
      );
      return { ...state, workouts: { ...state.workouts, sessions } };
    }
    case 'DELETE_WORKOUT': {
      const { date, workoutId } = action;
      const sessions = { ...state.workouts.sessions };
      const dayList = sessions[date] || [];
      const remaining = dayList.filter(w => w.id !== workoutId);
      if (remaining.length === 0) {
        delete sessions[date];
      } else {
        sessions[date] = remaining;
      }
      return { ...state, workouts: { ...state.workouts, sessions } };
    }
    case 'SAVE_ROUTINE': {
      const { routine } = action;
      const id = routine.id || uid();
      return {
        ...state,
        workouts: {
          ...state.workouts,
          routines: {
            ...state.workouts.routines,
            [id]: { ...routine, id, lastUsed: routine.lastUsed || null, useCount: routine.useCount || 0 },
          },
        },
      };
    }
    case 'TRACK_ROUTINE_USE': {
      const { routineId } = action;
      const r = state.workouts.routines[routineId];
      if (!r) return state;
      return {
        ...state,
        workouts: {
          ...state.workouts,
          routines: {
            ...state.workouts.routines,
            [routineId]: { ...r, useCount: (r.useCount || 0) + 1, lastUsed: new Date().toISOString() },
          },
        },
      };
    }
    case 'DELETE_ROUTINE': {
      const routines = { ...state.workouts.routines };
      delete routines[action.routineId];
      return { ...state, workouts: { ...state.workouts, routines } };
    }

    default:
      return state;
  }
}

// ─── Stats: derived data from state.entries ──────────────────────────
function computeStats(state) {
  const list = Object.entries(state.entries)
    .map(([date, e]) => ({ date, ...e, dayOfWeek: parseDOWFromISO(date) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const n = list.length;
  if (n === 0) {
    return { empty: true, list: [], n: 0 };
  }

  const latest = list[n - 1];
  const current = latest.weight;
  const prev = n > 1 ? list[n - 2] : null;
  const goal = state.goal.weight;
  const startWeight = state.user.startWeight ?? list[0].weight;

  // Find closest entry on or before target date (days back from latest)
  const findNearPast = (daysBack) => {
    const targetDate = addDaysISO(latest.date, -daysBack);
    for (let i = n - 1; i >= 0; i--) {
      if (list[i].date <= targetDate) return list[i];
    }
    return null;
  };

  const weekAgo = findNearPast(7);
  const monthAgo = findNearPast(30);

  const weights = list.map(e => e.weight);
  const peakIdx = weights.indexOf(Math.max(...weights));
  const lowIdx = weights.indexOf(Math.min(...weights));

  // Pace (kg/week): slope over the last 30 days of data available
  let paceKgPerWeek = null;
  if (monthAgo && monthAgo.date !== latest.date) {
    const span = list.filter(e => e.date >= monthAgo.date);
    if (span.length >= 2) {
      const days = daysBetweenISO(span[0].date, span[span.length-1].date);
      if (days > 0) {
        paceKgPerWeek = ((span[span.length-1].weight - span[0].weight) / days) * 7;
      }
    }
  } else if (list.length >= 2) {
    // fallback: use all data
    const days = daysBetweenISO(list[0].date, latest.date);
    if (days > 0) {
      paceKgPerWeek = ((latest.weight - list[0].weight) / days) * 7;
    }
  }

  const toGoal = goal !== null && goal !== undefined ? current - goal : null;

  // ETA computation with explicit reasons for failure
  let etaDays = null;
  let etaReason = null; // 'no_goal', 'no_pace', 'wrong_direction', 'reached', 'insufficient_data'

  if (toGoal === null) {
    etaReason = 'no_goal';
  } else if (Math.abs(toGoal) < 0.1) {
    etaReason = 'reached';
  } else if (paceKgPerWeek === null) {
    etaReason = list.length < 3 ? 'insufficient_data' : 'no_pace';
  } else if (paceKgPerWeek === 0) {
    etaReason = 'no_pace';
  } else if (Math.sign(paceKgPerWeek) !== -Math.sign(toGoal)) {
    // Going opposite direction (gaining when wanting to lose)
    etaReason = 'wrong_direction';
  } else {
    etaDays = Math.round(Math.abs(toGoal / paceKgPerWeek) * 7);
    // Cap at 5 years - longer makes no sense
    if (etaDays > 1825) {
      etaDays = null;
      etaReason = 'no_pace';
    }
  }

  const progressPct = (startWeight !== null && goal !== null && goal !== undefined && startWeight !== goal)
    ? Math.max(0, Math.min(100, 100 * (startWeight - current) / (startWeight - goal)))
    : null;

  // Streak: consecutive days with entries, ending today or yesterday
  let streak = 0;
  const daysSinceLatest = daysBetweenISO(latest.date, todayISO());
  if (daysSinceLatest <= 1) {
    let d = latest.date;
    while (state.entries[d]) {
      streak++;
      d = addDaysISO(d, -1);
    }
  }

  return {
    empty: false,
    list,
    n,
    current,
    previous: prev?.weight ?? null,
    dayDelta: prev ? current - prev.weight : null,
    deltaWeek: weekAgo && weekAgo.date !== latest.date ? current - weekAgo.weight : null,
    deltaMonth: monthAgo && monthAgo.date !== latest.date ? current - monthAgo.weight : null,
    peak: { weight: weights[peakIdx], date: list[peakIdx].date },
    low: { weight: weights[lowIdx], date: list[lowIdx].date },
    paceKgPerWeek,
    toGoal,
    etaDays,
    etaReason,
    progressPct,
    streak,
    latestDate: latest.date,
    latestTime: latest.time,
    startWeight,
    goal,
  };
}

// ─── BMI classification ─────────────────────────────────────────────
function bmiInfo(kg, heightCm) {
  if (!kg || !heightCm) return null;
  const bmi = kg / ((heightCm / 100) ** 2);
  let category, color;
  if (bmi < 18.5)      { category = 'תת־משקל';  color = T.cyan; }
  else if (bmi < 25)   { category = 'תקין';     color = T.lime; }
  else if (bmi < 30)   { category = 'עודף משקל'; color = T.amber; }
  else                 { category = 'השמנה';    color = T.rose; }
  return { bmi, category, color };
}

// ─── Collect recent meals for quick-add (no Claude call needed) ─────
// Returns most recent unique meals (by description) from the past N days
function collectRecentMeals(nutritionMeals, maxCount = 12, daysBack = 21) {
  const today = todayISO();
  const cutoff = addDaysISO(today, -daysBack);
  const all = [];
  for (const [date, meals] of Object.entries(nutritionMeals)) {
    if (date < cutoff) continue;
    for (const m of meals) {
      all.push({ ...m, _sourceDate: date });
    }
  }
  all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  // Dedupe by description
  const seen = new Set();
  const out = [];
  for (const m of all) {
    const key = (m.description || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= maxCount) break;
  }
  return out;
}

// ─── Pace recommendations ───────────────────────────────────────────
const PACE_CONFIG = {
  slow:       { label: 'איטי · בריא',    kgPerWeek: 0.3, color: T.cyan },
  balanced:   { label: 'מאוזן · מומלץ',  kgPerWeek: 0.5, color: T.lime },
  aggressive: { label: 'אגרסיבי',        kgPerWeek: 0.8, color: T.amber },
};
function weeksToGoal(current, goal, pace) {
  if (current === null || goal === null) return null;
  const diff = Math.abs(current - goal);
  const kpw = PACE_CONFIG[pace]?.kgPerWeek || 0.5;
  return Math.ceil(diff / kpw);
}

// ─── Nutrition goal auto-calc (Mifflin-St Jeor + deficit) ────────────
// Returns { calories, protein, carbs, fat } in grams / kcal
function calculateNutritionGoals(user, goal, currentKg) {
  const weight = currentKg ?? user.startWeight ?? 75;
  const height = user.heightCm || 175;
  const age = user.ageYears || 35;
  const isMale = (user.gender || 'male') === 'male';

  // BMR: Mifflin-St Jeor
  const bmr = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  // Activity: default "sedentary to light" = 1.4 (we don't track activity)
  const tdee = bmr * 1.4;

  // Deficit from target pace. 1kg fat ≈ 7700 kcal.
  const kpw = PACE_CONFIG[goal?.pace || 'balanced'].kgPerWeek;
  const dailyDeficit = (kpw * 7700) / 7;
  const calories = Math.round(tdee - dailyDeficit);

  // Protein: 1.6g / kg bodyweight (preserves muscle in deficit)
  const protein = Math.round(weight * 1.6);

  // Fat: 25% of calories
  const fat = Math.round(calories * 0.25 / 9);

  // Carbs: remainder
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs = Math.round(carbsKcal / 4);

  return { calories, protein, carbs, fat, tdee: Math.round(tdee), bmr: Math.round(bmr) };
}

// ─── API readiness check — works for both direct and shared modes ───
function apiReady(apiConfig) {
  if (!apiConfig) return false;
  if (apiConfig.mode === 'shared') return !!apiConfig.sharedPassword;
  return !!apiConfig.key;
}

// ─── Sum nutrition for a day ─────────────────────────────────────────
function sumMealsForDay(meals) {
  if (!meals || !meals.length) return { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
  return meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein || 0),
    carbs:    acc.carbs    + (m.carbs || 0),
    fat:      acc.fat      + (m.fat || 0),
    count:    acc.count    + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
}

// ─── Nutrition streak: consecutive days with at least 1 meal logged ──
function nutritionStreak(mealsByDay) {
  const today = todayISO();
  let streak = 0;
  let cursor = today;
  while (true) {
    const meals = mealsByDay[cursor];
    if (!meals || meals.length === 0) {
      // Allow today to be empty without breaking streak
      if (cursor === today) { cursor = addDaysISO(cursor, -1); continue; }
      break;
    }
    streak++;
    cursor = addDaysISO(cursor, -1);
    if (streak > 365) break; // sanity
  }
  return streak;
}

// ─── Sorted favorites (most used first, recent wins ties) ───────────
function sortedFavorites(favoritesMap, limit = 20) {
  const arr = Object.entries(favoritesMap || {}).map(([key, f]) => ({ key, ...f }));
  arr.sort((a, b) => {
    if (b.useCount !== a.useCount) return b.useCount - a.useCount;
    return (b.lastUsed || '').localeCompare(a.lastUsed || '');
  });
  return arr.slice(0, limit);
}

// ─── Gap-aware weight stats helpers ──────────────────────────────────
// Check if there's a gap > `days` between entries ending at latestDate
function hasGap(entries, daysBack, tolerance = 2) {
  // entries sorted asc; return true if no entry within tolerance of (latest - daysBack)
  if (!entries.length) return true;
  const latest = entries[entries.length - 1].date;
  const target = addDaysISO(latest, -daysBack);
  // Is there an entry within [target - tolerance, target + tolerance]?
  const lo = addDaysISO(target, -tolerance);
  const hi = addDaysISO(target, tolerance);
  return !entries.some(e => e.date >= lo && e.date <= hi);
}

// Find gap segments in a sorted entries list. Returns array of { from, to, days }
function findGaps(entries, minGapDays = 3) {
  if (!entries || entries.length < 2) return [];
  const gaps = [];
  for (let i = 1; i < entries.length; i++) {
    const d = daysBetweenISO(entries[i-1].date, entries[i].date);
    if (d >= minGapDays) gaps.push({ from: entries[i-1].date, to: entries[i].date, days: d });
  }
  return gaps;
}

// ─── Snapshot builder for Claude insights ───────────────────────────
// Collects the last N days of weight + nutrition + goal, sanitized for Claude.
function buildInsightSnapshot(state, stats, daysBack = 7) {
  const today = todayISO();
  const from = addDaysISO(today, -(daysBack - 1));
  const unit = state.settings.unit;

  // Weight entries in range
  const weightEntries = Object.entries(state.entries)
    .filter(([date]) => date >= from && date <= today)
    .map(([date, e]) => ({ date, weight_kg: e.weight }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Nutrition totals per day in range
  const nutritionByDay = {};
  for (let i = 0; i < daysBack; i++) {
    const date = addDaysISO(today, -i);
    const meals = state.nutrition.meals[date] || [];
    if (meals.length === 0) continue;
    const sums = sumMealsForDay(meals);
    nutritionByDay[date] = {
      calories: sums.calories,
      protein_g: sums.protein,
      carbs_g: sums.carbs,
      fat_g: sums.fat,
      meals_logged: sums.count,
    };
  }

  return {
    today,
    period: { from, to: today, days: daysBack },
    goal: {
      target_weight_kg: state.goal.weight,
      pace: state.goal.pace,
      pace_kg_per_week: PACE_CONFIG[state.goal.pace]?.kgPerWeek,
    },
    user: {
      height_cm: state.user.heightCm,
      age: state.user.ageYears,
      gender: state.user.gender,
      start_weight_kg: state.user.startWeight,
      start_date: state.user.startDate,
    },
    current_weight_kg: stats.current,
    total_loss_kg: stats.empty ? 0 : Math.round((state.user.startWeight - stats.current) * 10) / 10,
    weight_entries: weightEntries,
    weight_entries_count: weightEntries.length,
    weight_gaps: findGaps(weightEntries, 3),
    nutrition_goals: {
      daily_calories: state.nutrition.goals.calories,
      daily_protein_g: state.nutrition.goals.protein,
      daily_carbs_g: state.nutrition.goals.carbs,
      daily_fat_g: state.nutrition.goals.fat,
    },
    nutrition_by_day: nutritionByDay,
    nutrition_days_logged: Object.keys(nutritionByDay).length,
  };
  // mood_summary removed in v3.6 alongside the mood UI.
}

// ─── React Context ──────────────────────────────────────────────────
const StoreContext = React.createContext(null);

function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, null, loadState);
  const stats = React.useMemo(() => computeStats(state), [state]);

  React.useEffect(() => { saveState(state); }, [state]);

  const value = React.useMemo(() => ({ state, dispatch, stats }), [state, stats]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
