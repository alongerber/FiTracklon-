// ════════════════════════════════════════════════════════════════════
// 20-ai-prompts.jsx — AI system-prompt builders (v3.20 lean)
// ════════════════════════════════════════════════════════════════════
//
// All prompt strings (AI_PROMPTS persona × feature, plus the 6 standalone
// JSON-output prompts and 4 small label maps used by the workout plan
// generator) now live in /data/ai-prompts.json. This module keeps only
// the build* helpers — pure functions that interpolate state/data into
// the templates at call time.
//
// Loading model: every generate* in 12-claude-api.jsx awaits
//   loadData('ai-prompts')
// BEFORE invoking any build helper. The build helpers themselves are
// synchronous: they read from getDataSync (which is populated by the
// preceding loadData call). If somehow called before load completes,
// they fall back to a tiny inline stub and let the AI call still
// succeed (with a less-tuned prompt) rather than throwing.

// Inline last-resort fallbacks so that a builder called BEFORE the JSON
// has loaded still returns a usable system prompt. These are deliberately
// short — the rich prompts live in the JSON.
const _AIP_FALLBACKS = {
  AI_GENERIC: 'You are a helpful weight-coaching assistant for {NAME}. Keep responses concise, factual, and in Hebrew.',
  AUTO_CORRELATIONS_PROMPT: 'Analyze the JSON data and return JSON {correlations:[{pattern,support,action}]} or {insufficient_data:true}.',
  WHAT_IF_SCENARIOS_PROMPT: 'Analyze the scenario and return JSON {summary, details}.',
  MONTHLY_RECAP_PROMPT: 'Generate a monthly recap as JSON per the documented schema.',
  WEEKLY_INSIGHT_STRUCT_PROMPT: 'Return JSON {insight, records, interesting_numbers} or {insufficient_data:true}.',
  WORKOUT_VOICE_PARSER_PROMPT: 'Parse the Hebrew workout transcript and return JSON {exerciseId, exerciseName, reps, durationSec, weight, confidence, needsConfirmation}.',
  WORKOUT_PLAN_GENERATOR_PROMPT: 'Generate a Hebrew workout plan as JSON per the documented schema.',
  REPORT_INSIGHTS_SYSTEM_PROMPT: 'Generate Hebrew personal report insights as JSON per the documented schema.',
};

function _aiPromptsData() {
  return (typeof getDataSync === 'function') ? (getDataSync('ai-prompts') || {}) : {};
}

// ─── Per-persona × per-feature prompts (weekly_insight / plateau / goal) ──
// Build a system prompt for given persona + user, with optional holiday context.
// `windowDays` (optional) — if provided, the function checks for any holidays
// in the last N days and appends a single line.
function buildAISystemPrompt(promptType, state, windowDays) {
  const data = _aiPromptsData();
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');

  const promptSet = data.AI_PROMPTS && data.AI_PROMPTS[promptType];
  // Fallback path — data not loaded yet OR unknown promptType
  if (!promptSet) return _AIP_FALLBACKS.AI_GENERIC.replace('{NAME}', name);

  const template = promptSet[personaId] || promptSet.neutral;
  if (!template) return _AIP_FALLBACKS.AI_GENERIC.replace('{NAME}', name);

  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  let prompt = template.replace(/\[NAME\]/g, name).replace(/\[GENDER\]/g, genderHe);

  // Append holiday context if requested + helper is loaded (06-screen-home.jsx)
  if (windowDays && typeof holidaysInRange === 'function') {
    const today = todayISO();
    const from = addDaysISO(today, -(windowDays - 1));
    const holidays = holidaysInRange(from, today);
    if (holidays.length > 0) {
      const list = holidays.map(h => `${h.name} (${h.date})`).join(', ');
      prompt += `\n\nNote: this period included Jewish holidays — ${list}. Account for this when analyzing nutrition spikes or weight fluctuations.`;
    }
  }
  return prompt;
}

// ─── Auto-correlations (Opus, F1) ─────────────────────────────────
function buildAutoCorrelationsPrompt(state, snapshot) {
  const data = _aiPromptsData();
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');
  const template = data.AUTO_CORRELATIONS_PROMPT || _AIP_FALLBACKS.AUTO_CORRELATIONS_PROMPT;
  return template
    .replace('{persona}', personaId)
    .replace('{name}', name)
    .replace('{gender}', genderHe)
    .replace('{data}', JSON.stringify(snapshot));
}

// ─── What-if scenarios (Sonnet, F2) ───────────────────────────────
function buildWhatIfPrompt(state, snapshot, scenarioText) {
  const data = _aiPromptsData();
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');
  const template = data.WHAT_IF_SCENARIOS_PROMPT || _AIP_FALLBACKS.WHAT_IF_SCENARIOS_PROMPT;
  return template
    .replace('{persona}', personaId)
    .replace('{name}', name)
    .replace('{gender}', genderHe)
    .replace('{scenario}', (scenarioText || '').trim())
    .replace('{data}', JSON.stringify(snapshot));
}

// ─── Monthly recap (Opus) ─────────────────────────────────────────
function buildMonthlyRecapPrompt(state, monthData) {
  const data = _aiPromptsData();
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');
  const template = data.MONTHLY_RECAP_PROMPT || _AIP_FALLBACKS.MONTHLY_RECAP_PROMPT;
  return template
    .replace('{persona}', personaId)
    .replace('{name}', name)
    .replace('{gender}', genderHe)
    .replace('{data}', JSON.stringify(monthData));
}

// ─── Weekly insight (Sonnet, structured) ──────────────────────────
function buildWeeklyInsightStructPrompt(state, snapshot) {
  const data = _aiPromptsData();
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');
  const template = data.WEEKLY_INSIGHT_STRUCT_PROMPT || _AIP_FALLBACKS.WEEKLY_INSIGHT_STRUCT_PROMPT;
  return template
    .replace('{persona}', personaId)
    .replace('{name}', name)
    .replace('{gender}', genderHe)
    .replace('{data}', JSON.stringify(snapshot));
}

// ─── Voice → workout parser (Sonnet) ──────────────────────────────
// Catalog (EXERCISE_CATALOG) is interpolated at call time so a new
// exercise being added doesn't require regenerating ai-prompts.json.
function buildWorkoutVoiceParserPrompt() {
  const data = _aiPromptsData();
  const template = data.WORKOUT_VOICE_PARSER_PROMPT || _AIP_FALLBACKS.WORKOUT_VOICE_PARSER_PROMPT;
  const catalog = (typeof EXERCISE_CATALOG !== 'undefined' ? EXERCISE_CATALOG : []).map(ex => ({
    id: ex.id,
    name: ex.name,
    isDuration: !!ex.isDuration,
    hasWeight: !!ex.hasWeight,
  }));
  return template.replace('{catalog}', JSON.stringify(catalog));
}

// ─── Workout plan generator (Opus) ────────────────────────────────
// Pulls both the prompt template AND the 4 small Hebrew label maps
// (EXPERIENCE/LOCATION/GOAL/LIMITATION) from the ai-prompts JSON.
function buildWorkoutPlanPrompt(state, planSettings, currentWeightKg) {
  const data = _aiPromptsData();
  const template = data.WORKOUT_PLAN_GENERATOR_PROMPT || _AIP_FALLBACKS.WORKOUT_PLAN_GENERATOR_PROMPT;
  const expLabels = data.EXPERIENCE_LABELS_HE || {};
  const locLabels = data.LOCATION_LABELS_HE || {};
  const goalLabels = data.GOAL_LABELS_HE || {};
  const limLabels = data.LIMITATION_LABELS_HE || {};

  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');
  const age = state?.user?.ageYears || 35;
  const heightCm = state?.user?.heightCm || 170;
  const weightKg = currentWeightKg || state?.user?.startWeight || 75;

  const goalKg = state?.goal?.weight;
  const weightGoalLine = (goalKg !== null && goalKg !== undefined && weightKg)
    ? (weightKg > goalKg ? `ירידה של ${(weightKg - goalKg).toFixed(1)} ק״ג` :
       weightKg < goalKg ? `עלייה של ${(goalKg - weightKg).toFixed(1)} ק״ג` :
       'שמירה על המשקל')
    : 'לא הוגדרה';

  const limitations = (planSettings.limitations || []).map(l => limLabels[l] || l);
  const limitationsStr = limitations.length > 0 ? limitations.join(', ') : 'אין';
  const customLimitationLine = planSettings.custom_limitation
    ? `\n- מגבלה ספציפית: ${planSettings.custom_limitation}`
    : '';

  return template
    .replace('{name}', name)
    .replace('{gender}', genderHe)
    .replace('{age}', String(age))
    .replace('{heightCm}', String(heightCm))
    .replace('{weightKg}', String(weightKg))
    .replace('{weightGoal}', weightGoalLine)
    .replace('{experience}', expLabels[planSettings.experience]  || planSettings.experience)
    .replace('{location}',   locLabels[planSettings.location]    || planSettings.location)
    .replace('{duration}',   String(planSettings.duration))
    .replace('{frequency}',  String(planSettings.frequency))
    .replace('{goal}',       goalLabels[planSettings.goal]        || planSettings.goal)
    .replace('{limitations}', limitationsStr)
    .replace('{customLimitationLine}', customLimitationLine);
}

// ─── Personal report (Opus) ───────────────────────────────────────
// E3c: enriches filteredData with `holidays_in_period` (any Jewish
// holiday within the report window) so the model can frame nutrition spikes.
function buildReportPrompt(state, recipient, customRecipientLabel, filteredData) {
  const data = _aiPromptsData();
  const template = data.REPORT_INSIGHTS_SYSTEM_PROMPT || _AIP_FALLBACKS.REPORT_INSIGHTS_SYSTEM_PROMPT;

  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const genderHe = gender === 'female' ? 'נקבה' : 'זכר';
  const name = (state?.user?.name || '').trim() || (gender === 'female' ? 'משתמשת' : 'משתמש');

  const recipientLabel = (() => {
    switch (recipient) {
      case 'self':    return 'self (לעצמי)';
      case 'doctor':  return 'doctor (רופא/דיאטנית)';
      case 'trainer': return 'trainer (מאמן כושר)';
      case 'friend':  return 'friend (חבר/משפחה)';
      case 'other':   return `other (${(customRecipientLabel || '').trim() || 'אחר'})`;
      default:        return 'other';
    }
  })();

  let enrichedData = filteredData;
  if (typeof holidaysInRange === 'function' && filteredData?.period?.from && filteredData?.period?.to) {
    const hh = holidaysInRange(filteredData.period.from, filteredData.period.to);
    if (hh.length > 0) {
      enrichedData = { ...filteredData, holidays_in_period: hh };
    }
  }

  return template
    .replace('{filtered_data}', JSON.stringify(enrichedData))
    .replace('{recipient}', recipientLabel)
    .replace('{persona}', personaId)
    .replace('{gender}', genderHe)
    .replace('{name}', name);
}
