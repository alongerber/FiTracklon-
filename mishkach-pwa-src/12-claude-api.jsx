// ════════════════════════════════════════════════════════════════════
// 12-claude-api.jsx — תובנות AI wrapper, dual-mode (direct/shared)
// ════════════════════════════════════════════════════════════════════

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const PROXY_URL = '/api/claude';

// Pricing per 1M tokens (USD) — verified April 2026
const PRICING = {
  'claude-opus-4-7':           { in: 5,  out: 25 },
  'claude-opus-4-6':           { in: 5,  out: 25 },
  'claude-sonnet-4-6':         { in: 3,  out: 15 },
  'claude-haiku-4-5-20251001': { in: 1,  out: 5 },
};

// Model tiering: use the cheaper-but-excellent Sonnet for text parsing,
// keep Opus 4.7 for vision and reasoning-heavy insights.
const MODEL_BY_FEATURE = {
  nutrition_text:     'claude-sonnet-4-6',   // 40% cheaper, near-Opus quality on text
  nutrition_image:    'claude-opus-4-7',     // vision matters for product recognition
  nutrition_refine:   'claude-sonnet-4-6',   // v3.18: arithmetic on vision output, no reasoning bonus
  weekly_insight:     'claude-sonnet-4-6',   // v3.13: structured JSON, Sonnet plenty
  plateau_analysis:   'claude-opus-4-7',
  goal_calibration:   'claude-opus-4-7',
  report_insights:    'claude-opus-4-7',     // pattern-finding for personal report
  workout_voice:      'claude-sonnet-4-6',   // structured Hebrew→JSON, Sonnet handles fine
  monthly_recap:      'claude-opus-4-7',     // v3.13: cross-data correlations need Opus reasoning
  auto_correlations:  'claude-opus-4-7',     // pattern detection across many days — needs Opus reasoning
  what_if:            'claude-sonnet-4-6',   // forward projection from numbers — Sonnet handles
  workout_plan:       'claude-opus-4-7',     // v3.19: structured multi-day plan, programming quality matters
};

const DEFAULT_MODEL = 'claude-opus-4-7';

// ─── Low-level API call with dual-mode support ──────────────────────
// config: { mode: 'direct'|'shared', key, sharedPassword }
async function callClaude({ config, model = DEFAULT_MODEL, system, messages, maxTokens = 1024, onUsage }) {
  const mode = config?.mode || 'direct';
  const isShared = mode === 'shared';

  // Validate credentials
  if (isShared) {
    if (!config?.sharedPassword) throw new Error('חסר קוד גישה. הגדר בפרופיל.');
  } else {
    if (!config?.key) throw new Error('חסר API key. הוסף אותו בפרופיל.');
  }

  const body = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const url = isShared ? PROXY_URL : CLAUDE_API_URL;
  const headers = isShared ? {
    'content-type': 'application/json',
    'x-app-password': config.sharedPassword,
  } : {
    'x-api-key': config.key,
    'anthropic-version': CLAUDE_API_VERSION,
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (netErr) {
    throw new Error('כשל רשת. בדוק חיבור אינטרנט.');
  }

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const msg = data?.error?.message || `HTTP ${resp.status}`;
    const type = data?.error?.type || '';
    if (type === 'authentication_error') throw new Error(isShared ? 'קוד גישה שגוי.' : 'API key לא תקין.');
    if (type === 'rate_limit_error')     throw new Error('חריגת קצב. נסה שוב בעוד רגע.');
    if (type === 'overloaded_error')     throw new Error('השירות עמוס. נסה שוב.');
    if (type === 'cap_exceeded')         throw new Error(msg); // server-provided Hebrew msg
    if (type === 'server_error')         throw new Error(`תקלת שרת: ${msg}`);
    throw new Error(msg);
  }

  // Track usage
  if (onUsage && data.usage) {
    onUsage({
      input_tokens: data.usage.input_tokens || 0,
      output_tokens: data.usage.output_tokens || 0,
      model,
    });
  }

  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  return {
    text,
    usage: data.usage,
    raw: data,
    // Proxy passes through weekly budget info when available
    weeklySpend: data._weekly_spend,
    weeklyCap: data._weekly_cap,
    weeklyWarning: data._warning,
  };
}

// ─── JSON extraction (handles wrapped / bare JSON) ──────────────────
function extractJSON(text) {
  if (!text) throw new Error('תשובה ריקה מהמנוע.');
  // Try direct parse first
  try { return JSON.parse(text); } catch (_) {}
  // Try to find JSON block in markdown fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch (_) {}
  }
  // Try to find first { ... } balanced
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  throw new Error('הפלט שהתקבל לא תקין.');
}

// ─── Cost estimation ────────────────────────────────────────────────
function estimateCost(usage, model = DEFAULT_MODEL) {
  const p = PRICING[model] || PRICING[DEFAULT_MODEL];
  const inCost  = (usage.input_tokens  / 1_000_000) * p.in;
  const outCost = (usage.output_tokens / 1_000_000) * p.out;
  return inCost + outCost;
}

// ─── Image compression for API ──────────────────────────────────────
// Compress to max 1280px longest side, quality 0.82, return base64 JPEG
async function compressImageToBase64(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mediaType: 'image/jpeg', width: w, height: h, dataUrl });
      };
      img.onerror = () => reject(new Error('שגיאה בטעינת התמונה.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ.'));
    reader.readAsDataURL(file);
  });
}

// ─── Create a tiny thumbnail for storage (100x100 sq crop) ──────────
async function makeThumbnail(file, size = 96) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('thumbnail failed'));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════════════════════
// Prompt library — nutrition parsing + insights
// ════════════════════════════════════════════════════════════════════

const PROMPTS = {
  // ─── Parse nutrition from free-form Hebrew text ─────────────────
  nutritionText: {
    system: `You are a nutrition estimation engine for an Israeli Hebrew weight-tracking app.

Given a description of a meal (in Hebrew), estimate calories, protein, carbs, and fat.

Important:
- The user may describe Israeli foods (שניצל, חומוס, מעדני פרו, יוגורט יטבתה, פיתה, חלה, סלט ישראלי, בורקס, פלאפל). Use your knowledge of these products and typical Israeli portions.
- If portions are ambiguous ("אכלתי שניצל"), assume a normal single-serving portion and note the assumption.
- For branded products (מעדני פרו, יוגורטים, חטיפי חלבון), recall the standard nutrition values if known.
- Round to whole numbers.
- Stay realistic. Don't inflate or deflate values to be "nice".

Return ONLY valid JSON, no markdown, no preamble, no trailing text:
{
  "calories": <number>,
  "protein": <grams, number>,
  "carbs": <grams, number>,
  "fat": <grams, number>,
  "items": [{"name": "<Hebrew name>", "amount": "<Hebrew portion, e.g., 200 גרם or יחידה>"}],
  "confidence": "high" | "medium" | "low",
  "notes": "<Hebrew, 1-2 short sentences about assumptions. Empty string if none.>"
}`,
    userPrefix: 'ארוחה לניתוח:\n',
    maxTokens: 600,
  },

  // ─── Parse nutrition from image (food OR label OR product) ──────
  // v3.18: now also returns `classification` so the caller can drive the
  // refinement-questions flow. Classification is independent of `detected`
  // (which is meal/label/product) — it bins by FOOD CATEGORY for context
  // questions about portion / oil / cheese / etc.
  nutritionImage: {
    system: `You are a nutrition estimation engine analyzing a food photo for an Israeli Hebrew app.

The image will show ONE of these:
1. A prepared meal / plate of food → identify items, estimate portions visually, calculate totals.
2. A nutrition facts label (לוח תזונה) → read values directly. Values shown per 100g/100ml, calculate for the full container if apparent.
3. A branded Israeli product (מעדני פרו, יוגורט יטבתה, חטיף חלבון אתגרים, שוקו תנובה, וכו') → use your knowledge of the standard nutrition for that exact product and container size.

For branded Israeli products: recognize the brand+flavor+size. מעדני פרו 150g is typically 90-110 kcal, 14-18g protein.

If uncertain about portion or flavor, pick the most common variant and note it in "notes". The user will verify and edit before saving.

Return ONLY valid JSON:
{
  "calories": <number>,
  "protein": <grams>,
  "carbs": <grams>,
  "fat": <grams>,
  "items": [{"name": "<Hebrew>", "amount": "<Hebrew>"}],
  "detected": "meal" | "label" | "product",
  "productName": "<if product detected, Hebrew name + brand>",
  "confidence": "high" | "medium" | "low",
  "notes": "<Hebrew explanation of assumptions, empty if none>",
  "classification": "starch" | "protein" | "salad" | "pastry" | "mixed" | "soup" | "drink" | "other"
}

Classification rules (pick exactly one):
- starch: pasta, rice, bread, pita, potato, couscous, quinoa, סנדוויץ' מבוסס לחם
- protein: meat / chicken / fish / eggs / tofu when it's the dominant component
- salad: salad or raw vegetables as the main item
- pastry: baked good, dessert, cake, בורקס, מלאווח
- soup: soup, broth, מרק
- drink: coffee, smoothie, juice, soda, milk, alcoholic beverage
- mixed: clearly a composite plate (e.g. pasta + steak + salad together) — use only when no single category dominates
- other: anything that doesn't fit (yogurt cup, snack bar, sushi, ethnic dishes that span categories)
For nutrition labels and isolated branded products use "other" unless the product itself fits a category (cookie packet → pastry, soda → drink).`,
    userText: 'נתח את התמונה והחזר ערכי תזונה.',
    maxTokens: 750,
  },

  // ─── Refinement: AI re-estimates after user answers context questions ──
  // v3.18. Caller (RefinementScreen) sends:
  //   { food_name, base: {calories, protein, carbs, fat}, classification,
  //     answers: [{question_id, label, value, all_options}] }
  // Server returns:
  //   { calories, protein, carbs, fat, explanation }
  //
  // Use Sonnet — this is a structured-math task, no reasoning bonus from Opus.
  photoRefinement: {
    system: `You are a nutrition expert refining a calorie estimate based on context clues.

INPUT (JSON in user message):
{
  "food_name": "<Hebrew description from vision>",
  "classification": "starch|protein|salad|pastry|soup|drink|mixed|other",
  "base": { "calories": N, "protein": N, "carbs": N, "fat": N },
  "answers": [ { "question_id": "<id>", "label": "<Hebrew question>", "value": "<Hebrew chosen answer>" }, ... ]
}

Apply the answers as multiplicative adjustments to the base values:

PORTION SIZE (gads cal × all macros):
  קטן/קטנה  → ×0.7
  רגיל/רגילה → ×1.0
  גדול/גדולה → ×1.4

OIL / SAUCE / שמן / רוטב / חמאה / שמנת:
  לא       → ×0.9 cal, ×0.8 fat
  קצת      → ×1.0 (no change)
  הרבה     → ×1.2 cal, ×1.5 fat

CHEESE / MEAT ADD-IN (גבינה / בשר נטחן):
  לא       → no change
  קצת      → +60 cal, +5g protein, +4g fat
  הרבה     → +150 cal, +12g protein, +10g fat

EXTRAS (אגוזים / גרעינים):
  לא       → no change
  קצת      → +50 cal, +5g fat
  הרבה     → +120 cal, +12g fat

BAKED-COUNT (כמה חתיכות):
  multiply ALL macros by the count (1, 2, or 3 — for "3+" use 3.5)

DRINK SWEETENER (סוכר / חלב):
  לא       → ×0.7 cal
  קצת      → ×1.0
  הרבה     → ×1.4 cal, +5g carbs

For SAUCE on protein:
  יבש          → ×0.9 cal
  ברוטב קל    → ×1.0
  ברוטב כבד   → ×1.25 cal, +6g fat

Apply each adjustment in sequence. Round all values to whole integers.

Return ONLY this JSON, no markdown, no preamble:
{
  "calories": <int>,
  "protein": <int>,
  "carbs": <int>,
  "fat": <int>,
  "explanation": "<Hebrew, 1–2 short sentences describing what changed and why>"
}`,
    maxTokens: 350,
  },

  // ─── Weekly insight (Opus, higher context) ──────────────────────
  weeklyInsight: {
    system: `You are Alon's candid weight-coaching analyst. Write in Hebrew, 2nd person ("אתה"), direct and honest. No "מצוין!", no "כל הכבוד", no cheerleading.

Input: 7-day snapshot of weight entries + daily nutrition totals + goals.

Write exactly 3 short paragraphs (≤40 words each):
1. What happened this week (facts only, concrete numbers)
2. One non-obvious pattern OR calibration issue (not "אכלת יותר ביום שישי" — something a data-savvy coach would notice)
3. ONE specific actionable suggestion for next week (not vague "תאכל פחות")

No bullet points, no headers. Flowing Hebrew prose.
If data is too sparse for meaningful analysis (under 3 weight entries or 3 nutrition days), say so honestly in one paragraph instead of inventing insights.

Return as plain text, no JSON, no markdown.`,
    maxTokens: 500,
  },

  // ─── Plateau analysis (Opus) ────────────────────────────────────
  plateauAnalysis: {
    system: `You analyze weight plateaus for Alon's tracking app. Write in Hebrew, 2nd person, direct.

Given a plateau period (days without significant weight change) + full nutrition history + pace target:
1. Identify 1-2 most likely causes from the DATA ONLY (not generic advice).
2. Suggest 1 concrete adjustment with numbers.

Format: 2-3 short sentences in Hebrew. No headers. No "זה יכול להיות הרבה דברים" — commit to a hypothesis based on the data.

Return plain text only.`,
    maxTokens: 400,
  },

  // ─── Dynamic goal calibration (Opus) ────────────────────────────
  goalCalibration: {
    system: `You recalibrate weight-loss goals. Write in Hebrew, short, direct.

Input: user's target pace, their actual pace over 3+ weeks, current nutrition averages.

Output: 1-2 sentences explaining the gap, then 2 concrete alternatives:
(A) Adjust nutrition (exact calorie change).
(B) Adjust the goal timeline (new target date).

Format: 2-3 sentences Hebrew. Concrete numbers. No padding.

Return plain text.`,
    maxTokens: 300,
  },
};

// ─── High-level: parse meal from text (Sonnet 4.6 — 40% cheaper) ────
async function parseNutritionFromText(text, config, onUsage) {
  const p = PROMPTS.nutritionText;
  const { text: responseText } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.nutrition_text,
    system: p.system,
    messages: [{ role: 'user', content: p.userPrefix + text }],
    maxTokens: p.maxTokens,
    onUsage,
  });
  const parsed = extractJSON(responseText);
  return normalizeNutrition(parsed);
}

// ─── High-level: parse meal from image (Opus 4.7 — vision quality) ──
async function parseNutritionFromImage(file, config, onUsage) {
  const { base64, mediaType } = await compressImageToBase64(file);
  const p = PROMPTS.nutritionImage;
  const { text: responseText } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.nutrition_image,
    system: p.system,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: p.userText },
      ],
    }],
    maxTokens: p.maxTokens,
    onUsage,
  });
  const parsed = extractJSON(responseText);
  const thumb = await makeThumbnail(file).catch(() => null);
  return { ...normalizeNutrition(parsed), thumbnail: thumb };
}

// ─── Normalize: ensure numbers, default missing ─────────────────────
function normalizeNutrition(p) {
  const num = (v, def = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? def : Math.round(n);
  };
  // v3.18: validate classification — must be one of the expected enum values,
  // else null (caller treats null as "skip refinement").
  const VALID_CLASSES = new Set(['starch','protein','salad','pastry','mixed','soup','drink','other']);
  const cls = typeof p.classification === 'string' && VALID_CLASSES.has(p.classification)
    ? p.classification
    : null;
  return {
    calories: Math.max(0, num(p.calories)),
    protein:  Math.max(0, num(p.protein)),
    carbs:    Math.max(0, num(p.carbs)),
    fat:      Math.max(0, num(p.fat)),
    items:    Array.isArray(p.items) ? p.items : [],
    detected: p.detected || 'text',
    productName: p.productName || '',
    confidence: p.confidence || 'medium',
    notes: p.notes || '',
    classification: cls,
  };
}

// ─── v3.18: refine a vision estimate via context questions ──────────
// `base`   = { calories, protein, carbs, fat }   (what vision returned)
// `answers` = [{ question_id, label, value }]    (chosen chips)
// Returns { calories, protein, carbs, fat, explanation } — caller swaps
// these into the per-unit values shown in ReviewAndSave.
async function refineMealFromQuestions({ foodName, classification, base, answers }, config, onUsage) {
  const p = PROMPTS.photoRefinement;
  const userPayload = {
    food_name: foodName || '',
    classification: classification || 'other',
    base: {
      calories: Math.round(base.calories || 0),
      protein:  Math.round(base.protein  || 0),
      carbs:    Math.round(base.carbs    || 0),
      fat:      Math.round(base.fat      || 0),
    },
    answers: (answers || []).map(a => ({
      question_id: a.question_id,
      label: a.label,
      value: a.value,
    })),
  };
  const { text: responseText } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.nutrition_refine,
    system: p.system,
    messages: [{ role: 'user', content: JSON.stringify(userPayload, null, 2) }],
    maxTokens: p.maxTokens,
    onUsage,
  });
  const parsed = extractJSON(responseText);
  const num = (v, fallback) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? fallback : Math.max(0, Math.round(n));
  };
  return {
    calories:    num(parsed.calories, base.calories),
    protein:     num(parsed.protein,  base.protein),
    carbs:       num(parsed.carbs,    base.carbs),
    fat:         num(parsed.fat,      base.fat),
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
  };
}

// ─── High-level: weekly insight (persona-aware) ─────────────────────
// v3.13: returns STRUCTURED JSON via WEEKLY_INSIGHT_STRUCT_PROMPT.
//   { insight, records, interesting_numbers } or { insufficient_data: true }
// Caller (WeeklyInsightCard) renders new layout when payload has `.insight`,
// otherwise falls back to legacy `.text` rendering for cached pre-v3.13 payloads.
async function generateWeeklyInsight(snapshot, config, onUsage, state) {
  const system = buildWeeklyInsightStructPrompt(state || {}, snapshot);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.weekly_insight,
    system,
    messages: [{ role: 'user', content: 'הוצא JSON תקין לפי הסכמה.' }],
    maxTokens: 600,
    onUsage,
  });
  return extractJSON(text);
}

async function generatePlateauAnalysis(snapshot, config, onUsage, state) {
  const system = state
    ? buildAISystemPrompt('plateau_analysis', state, 21)
    : PROMPTS.plateauAnalysis.system;
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.plateau_analysis,
    system,
    messages: [{ role: 'user', content: JSON.stringify(snapshot, null, 2) }],
    maxTokens: PROMPTS.plateauAnalysis.maxTokens,
    onUsage,
  });
  return text.trim();
}

async function generateGoalCalibration(snapshot, config, onUsage, state) {
  const system = state
    ? buildAISystemPrompt('goal_calibration', state, 21)
    : PROMPTS.goalCalibration.system;
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.goal_calibration,
    system,
    messages: [{ role: 'user', content: JSON.stringify(snapshot, null, 2) }],
    maxTokens: PROMPTS.goalCalibration.maxTokens,
    onUsage,
  });
  return text.trim();
}

// ─── Monthly recap (Sonnet) ─────────────────────────────────────────
// Returns { achievements: string[], next_steps: string }.
// Caller already shows numeric KPIs — this is the qualitative layer.
async function generateMonthlyRecap(monthData, config, onUsage, state) {
  const system = buildMonthlyRecapPrompt(state, monthData);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.monthly_recap,
    system,
    messages: [{ role: 'user', content: 'הוצא JSON תקין לפי הסכמה.' }],
    maxTokens: 1400,  // v3.13: much richer schema (3 insights + 4 records + 4 numbers)
    onUsage,
  });
  return extractJSON(text);
}

// ─── Auto-correlations (Opus) ──────────────────────────────────────
// Returns { correlations: [{pattern, support, action}] } or
// { insufficient_data: true } or { correlations: [] } when no patterns
// hit the >=60% support bar.
async function generateAutoCorrelations(snapshot, config, onUsage, state) {
  const system = buildAutoCorrelationsPrompt(state, snapshot);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.auto_correlations,
    system,
    messages: [{ role: 'user', content: 'נתח את הדאטה והחזר JSON.' }],
    maxTokens: 600,
    onUsage,
  });
  return extractJSON(text);
}

// ─── What-if scenarios (Sonnet) ────────────────────────────────────
// `scenario` is the user-facing question text (preset OR custom).
// Returns { summary, details } — short, numeric, specific.
async function generateWhatIf(snapshot, scenarioText, config, onUsage, state) {
  const system = buildWhatIfPrompt(state, snapshot, scenarioText);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.what_if,
    system,
    messages: [{ role: 'user', content: scenarioText }],
    maxTokens: 350,
    onUsage,
  });
  return extractJSON(text);
}

// ─── v3.19: AI workout plan generator (Opus) ────────────────────────
// `planSettings` matches state.workouts.plan_settings (questionnaire answers).
// `currentWeightKg` is sourced from stats.current at the call site so the
// model can frame the plan around the user's actual current weight.
//
// Returns the parsed plan JSON. Caller is responsible for normalizing IDs
// (we trust the model + the Hebrew prompt rules but defensive-clamp the
// most critical fields below). On error throws like other API helpers.
async function generateWorkoutPlan(planSettings, currentWeightKg, config, onUsage, state) {
  const system = buildWorkoutPlanPrompt(state || {}, planSettings, currentWeightKg);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.workout_plan,
    system,
    // Keep the user message tiny — all the substance is in the system prompt.
    messages: [{ role: 'user', content: 'הוצא JSON תקין לפי הסכמה.' }],
    maxTokens: 4000, // 7-day plan with multiple workouts × multiple exercises = lots of tokens
    onUsage,
  });
  const parsed = extractJSON(text);

  // Defensive normalization — guard against missing/malformed fields so
  // the rest of the app can render without null-checks everywhere.
  const HEBREW_DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const safeStr = (v, fallback = '') => typeof v === 'string' ? v : fallback;
  const safeNum = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? fallback : n;
  };

  // Schedule: pad/truncate to 7 entries in the canonical day order.
  const inputSchedule = Array.isArray(parsed.weekly_schedule) ? parsed.weekly_schedule : [];
  const scheduleByDay = {};
  inputSchedule.forEach(s => { if (s && HEBREW_DAYS.includes(s.day)) scheduleByDay[s.day] = s.workout_id || null; });
  const weekly_schedule = HEBREW_DAYS.map(day => ({
    day,
    workout_id: scheduleByDay[day] || null,
  }));

  const workouts = (Array.isArray(parsed.workouts) ? parsed.workouts : []).map((w, wi) => ({
    id: safeStr(w.id, `w${wi + 1}`),
    name: safeStr(w.name, 'אימון'),
    duration_estimate: Math.round(safeNum(w.duration_estimate, planSettings.duration || 30)),
    warmup: (Array.isArray(w.warmup) ? w.warmup : []).map(item => ({
      name: safeStr(item?.name),
      duration: Math.round(safeNum(item?.duration, 30)),
      instruction: safeStr(item?.instruction),
    })),
    exercises: (Array.isArray(w.exercises) ? w.exercises : []).map((ex, ei) => ({
      id: safeStr(ex?.id, `${w.id || 'w' + (wi + 1)}-ex${ei + 1}`),
      name: safeStr(ex?.name, 'תרגיל'),
      instruction: safeStr(ex?.instruction),
      sets: Math.max(1, Math.round(safeNum(ex?.sets, 3))),
      reps: safeStr(ex?.reps, '8-12'),
      rest_seconds: Math.max(15, Math.round(safeNum(ex?.rest_seconds, 60))),
      tip: safeStr(ex?.tip),
      equipment: safeStr(ex?.equipment, 'none'),
    })),
    cooldown: (Array.isArray(w.cooldown) ? w.cooldown : []).map(item => ({
      name: safeStr(item?.name),
      duration: Math.round(safeNum(item?.duration, 30)),
    })),
  }));

  return {
    plan_name: safeStr(parsed.plan_name, 'תוכנית אימונים'),
    summary: safeStr(parsed.summary),
    weekly_schedule,
    workouts,
    tips: Array.isArray(parsed.tips) ? parsed.tips.filter(t => typeof t === 'string') : [],
    generated_at: new Date().toISOString(),
  };
}

// ─── Voice → workout parser (Sonnet) ────────────────────────────────
// Takes a Hebrew transcript from Web Speech API and returns:
//   { exerciseId, exerciseName, reps, durationSec, weight, confidence,
//     needsConfirmation }
// Throws on network/auth errors; caller handles them via personaErrorFromException.
async function parseWorkoutFromVoice(transcriptText, config, onUsage) {
  const system = buildWorkoutVoiceParserPrompt();
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.workout_voice,
    system,
    messages: [{ role: 'user', content: 'המשתמש אמר: "' + (transcriptText || '').trim() + '"' }],
    maxTokens: 250,
    onUsage,
  });
  const parsed = extractJSON(text);
  // Normalize types so the form code can trust them
  return {
    exerciseId: parsed.exerciseId || null,
    exerciseName: (parsed.exerciseName || '').trim(),
    reps: Math.max(0, parseInt(parsed.reps) || 0),
    durationSec: Math.max(0, parseInt(parsed.durationSec) || 0),
    weight: parsed.weight && parsed.weight > 0 ? parseFloat(parsed.weight) : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    needsConfirmation: !!parsed.needsConfirmation,
  };
}

// ─── Personal report insights (Opus) ────────────────────────────────
// Returns parsed JSON: { discovery, explanation, action, headline, whatsapp_summary }
// or { insufficient_data: true } if the model determines there's not enough.
// `recipient` is one of: 'self' | 'doctor' | 'trainer' | 'friend' | 'other'.
async function generateReportInsights(snapshot, recipient, customRecipientLabel, config, onUsage, state) {
  const system = buildReportPrompt(state, recipient, customRecipientLabel, snapshot);
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.report_insights,
    system,
    messages: [{ role: 'user', content: 'הוצא JSON תקין לפי הסכמה.' }],
    maxTokens: 900,
    onUsage,
  });
  return extractJSON(text);
}
