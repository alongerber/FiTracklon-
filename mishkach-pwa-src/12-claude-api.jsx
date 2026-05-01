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
  weekly_insight:     'claude-opus-4-7',     // reasoning quality critical
  plateau_analysis:   'claude-opus-4-7',
  goal_calibration:   'claude-opus-4-7',
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
  "notes": "<Hebrew explanation of assumptions, empty if none>"
}`,
    userText: 'נתח את התמונה והחזר ערכי תזונה.',
    maxTokens: 700,
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
  };
}

// ─── High-level: weekly insight (persona-aware) ─────────────────────
async function generateWeeklyInsight(snapshot, config, onUsage, state) {
  // Use persona-specific prompt if state provided, else fallback to generic
  const system = state
    ? buildAISystemPrompt('weekly_insight', state)
    : PROMPTS.weeklyInsight.system;
  const { text } = await callClaude({
    config,
    model: MODEL_BY_FEATURE.weekly_insight,
    system,
    messages: [{ role: 'user', content: JSON.stringify(snapshot, null, 2) }],
    maxTokens: PROMPTS.weeklyInsight.maxTokens,
    onUsage,
  });
  return text.trim();
}

async function generatePlateauAnalysis(snapshot, config, onUsage, state) {
  const system = state
    ? buildAISystemPrompt('plateau_analysis', state)
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
    ? buildAISystemPrompt('goal_calibration', state)
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
