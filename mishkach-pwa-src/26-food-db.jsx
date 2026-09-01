// ════════════════════════════════════════════════════════════════════
// 26-food-db.jsx — Israeli National Nutrition Database (משרד הבריאות)
// 4,624 foods · per-100g macros · household portion weights in grams.
// Source: data.gov.il / ministry-health "מאגר התזונה הלאומי הישראלי"
//
// WHY THIS EXISTS
// The model used to do two jobs at once: identify the food AND recall its
// nutrition numbers. It is excellent at the first and unreliable at the
// second. This module takes the second job away from it: the model returns
// a name + a mass in grams, we look the numbers up here, and we do the
// arithmetic ourselves. No hallucinated macros, no mental math.
// ════════════════════════════════════════════════════════════════════

let _foods = null;      // [{n, kcal, p, c, f, fib, na, u:[[unitName, grams]]}]
let _index = null;      // Map<token, Set<foodIdx>>
let _df    = null;      // Map<token, documentFrequency>  — for IDF weighting

// ─── Hebrew normalization ───────────────────────────────────────────
// Final forms, niqqud, geresh, and the single-letter prefixes that Hebrew
// glues onto nouns (ב/ל/כ/מ/ה/ו/ש) — "בפיתה" must match "פיתה".
const FINALS = { 'ם':'מ', 'ן':'נ', 'ץ':'צ', 'ף':'פ', 'ך':'כ' };
const PREFIXES = ['ומה','שה','וה','מה','כש','ב','ל','כ','מ','ה','ו','ש'];

function normToken(t) {
  let s = t
    .replace(/[֑-ׇ]/g, '')      // niqqud + cantillation
    .replace(/["'`׳״]/g, '')
    .replace(/[^֐-׿a-zA-Z0-9]/g, '');
  s = s.replace(/[םןץףך]/g, ch => FINALS[ch]);
  return s.toLowerCase();
}

// Return the token plus its de-prefixed form, so "בפיתה" indexes as "פיתה" too.
function tokenVariants(t) {
  const base = normToken(t);
  if (base.length < 3) return base ? [base] : [];
  const out = [base];
  for (const p of PREFIXES) {
    if (base.startsWith(p) && base.length - p.length >= 3) {
      out.push(base.slice(p.length));
      break;
    }
  }
  return out;
}

function tokenize(text) {
  return (text || '')
    .split(/[\s,./()\-–—+]+/)
    .flatMap(tokenVariants)
    .filter(Boolean);
}

// ─── Negation ───────────────────────────────────────────────────────
// "אורז לבן מבושל" must NOT match "אורז, לבן, לא מבושל" (365 kcal dry vs
// 145 cooked — a 2.5x error, worse than the estimate we are replacing).
// A name that negates a word the user affirmed is disqualified, and vice
// versa. Same for ללא / ל לא תוספת.
const NEG_WORDS = new Set(['לא', 'ללא', 'בלי', 'נטול', 'דל']);

function negatedTokens(text) {
  const raw = (text || '').split(/[\s,./()\-–—+]+/).map(normToken).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < raw.length - 1; i++) {
    if (NEG_WORDS.has(raw[i])) {
      // the negation carries to the next 2 content words
      for (let j = i + 1; j <= Math.min(i + 2, raw.length - 1); j++) {
        if (!NEG_WORDS.has(raw[j])) out.add(raw[j]);
      }
    }
  }
  return out;
}

// FFQ-* rows are food-frequency-questionnaire aggregates (survey categories,
// not dishes). Real names beat them whenever a real name matches at all.
function isAggregate(name) { return /^FFQ/i.test((name || '').trim()); }

// ─── Load + index ───────────────────────────────────────────────────
// Called once, lazily, from the data loader. ~137KB gzipped over the wire;
// the index build is ~30ms on a mid-range phone.
function loadFoodDB(foods) {
  _foods = foods;
  _index = new Map();
  _df = new Map();
  foods.forEach((food, i) => {
    const seen = new Set(tokenize(food.n));
    seen.forEach(tok => {
      if (!_index.has(tok)) _index.set(tok, new Set());
      _index.get(tok).add(i);
      _df.set(tok, (_df.get(tok) || 0) + 1);
    });
  });
  return foods.length;
}

function foodDBReady() { return !!_foods; }

// ─── Search ─────────────────────────────────────────────────────────
// Scoring, in order of weight:
//   1. IDF — "סויה" discriminates, "עם" does not.
//   2. Query coverage — how much of what the user said we matched.
//   3. Brevity — "פיתה" beats "פיתה במילוי גבינה בולגרית ועגבניות"
//      when the query was just "פיתה". Long names are specific dishes;
//      matching one by accident is worse than matching the plain item.
function searchFood(query, limit = 5) {
  if (!_foods) return [];
  // Coverage is measured over the WORDS the user typed, not over the expanded
  // token variants: "בפיתה" expands to ["בפיתה","פיתה"], and counting both in
  // the denominator would cap a perfect single-word match at 50%.
  const qWords = (query || '')
    .split(/[\s,./()\-–—+]+/)
    .map(w => tokenVariants(w))
    .filter(v => v.length);
  const qTokens = [...new Set(qWords.flat())];
  if (!qTokens.length) return [];

  const N = _foods.length;
  const scores = new Map();

  for (const tok of qTokens) {
    const hits = _index.get(tok);
    if (!hits) continue;
    const idf = Math.log(N / hits.size);
    for (const i of hits) {
      scores.set(i, (scores.get(i) || 0) + idf);
    }
  }
  if (!scores.size) return [];

  const qNeg = negatedTokens(query);
  const qPos = new Set(qTokens.filter(t => !qNeg.has(t) && !NEG_WORDS.has(t)));

  const ranked = [...scores.entries()].map(([i, s]) => {
    const food = _foods[i];
    const nameTokens = tokenize(food.n);
    const nameSet = new Set(nameTokens);
    const matched = qWords.filter(variants => variants.some(t => nameSet.has(t))).length;
    const coverage = matched / qWords.length;

    // Missing a HIGH-IDF query token is near-fatal. "אורז לבן מבושל" must
    // not resolve to "לבן מבושל" (cultured milk, 41 kcal) just because that
    // name is short — dropping "אורז" changes the food entirely.
    let missPenalty = 1;
    for (const t of qTokens) {
      if (nameSet.has(t)) continue;
      const dfT = _df.get(t) || N;
      const idfT = Math.log(N / dfT);
      missPenalty *= Math.max(0.12, 1 - idfT / 9);
    }

    // Brevity only breaks ties among equally-covering names.
    const brevity = 1 / (1 + Math.max(0, nameTokens.length - matched) * 0.18);

    // Polarity: punish a name that negates what the user affirmed
    // (query "מבושל" vs name "לא מבושל"), and the reverse.
    const nNeg = negatedTokens(food.n);
    let polarity = 1;
    for (const t of qPos)  if (nNeg.has(t)) polarity *= 0.06;
    for (const t of qNeg)  if (nameTokens.includes(t) && !nNeg.has(t)) polarity *= 0.06;

    return {
      food,
      score: s * missPenalty * (0.2 + 0.8 * coverage) * brevity * polarity,
      coverage, matched, polarity,
      aggregate: isAggregate(food.n),
    };
  });

  // A real food always beats a survey category. FFQ rows are only an answer
  // when nothing else matched at all — "בפיתה" must resolve to פיתה, not to
  // "FFQ-פלאפל בפיתה", however well that row happens to score.
  const real = ranked.filter(r => !r.aggregate);
  const pool = real.length ? real : ranked;
  pool.sort((a, b) => b.score - a.score);
  // Confidence gate. A weak top hit is worse than no hit: it silently
  // substitutes a different food. Below `strong`, the caller must show the
  // alternatives and ask, or fall back to the model's own estimate.
  const top = pool[0];
  const strong = !!top && top.coverage >= 0.6 && top.polarity === 1 && !top.aggregate;

  return pool.slice(0, limit).map(r => ({
    ...r.food,
    _score: Math.round(r.score * 100) / 100,
    _coverage: Math.round(r.coverage * 100) / 100,
    _confident: r === top ? strong : false,
  }));
}

// ─── Compute macros for a mass ──────────────────────────────────────
// The whole point: arithmetic in JS, not in the model's head.
function macrosFor(food, grams) {
  const k = grams / 100;
  return {
    calories: Math.round(food.kcal * k),
    protein:  Math.round(food.p    * k * 10) / 10,
    carbs:    Math.round(food.c    * k * 10) / 10,
    fat:      Math.round(food.f    * k * 10) / 10,
    fiber:    Math.round(food.fib  * k * 10) / 10,
    sodium:   Math.round(food.na   * k),
  };
}

// Resolve "גביע" / "מנה בינונית" / "כף" to grams using the food's own
// household-unit table. Falls back to null so the caller can ask.
function gramsForUnit(food, unitName, count = 1) {
  const hit = (food.u || []).find(([name]) => normToken(name) === normToken(unitName));
  return hit ? hit[1] * count : null;
}

// ─── Atwater cross-check ────────────────────────────────────────────
// 4 kcal/g protein + 4 kcal/g carb + 9 kcal/g fat (+7 for alcohol).
// If a stated calorie figure disagrees with its own macros by more than
// `tolerance`, the response is internally inconsistent — surface it
// instead of saving a number we know is wrong.
function atwaterCheck(m, tolerance = 0.18) {
  const derived = 4 * (m.protein || 0) + 4 * (m.carbs || 0) + 9 * (m.fat || 0);
  if (!derived) return { ok: true, derived: 0, delta: 0 };
  const delta = Math.abs((m.calories || 0) - derived) / derived;
  return { ok: delta <= tolerance, derived: Math.round(derived), delta: Math.round(delta * 100) / 100 };
}

// ─── Boot wiring ────────────────────────────────────────────────────
// NOT prefetched at app boot: the bundle is ~137KB gzipped and nothing on
// the home screen needs it. It loads the moment the user opens "הוספת ארוחה",
// which is a beat before the first lookup can possibly be needed, and it is
// served from the service-worker cache on every visit after the first.
let _foodDBPending = null;

function ensureFoodDB() {
  if (_foods) return Promise.resolve(_foods.length);
  if (_foodDBPending) return _foodDBPending;
  if (typeof loadData !== 'function') return Promise.reject(new Error('no loader'));
  _foodDBPending = loadData('il-foods')
    .then(rows => { _foodDBPending = null; return loadFoodDB(rows); })
    .catch(err => { _foodDBPending = null; throw err; });
  return _foodDBPending;
}

// React hook — returns the food count once loaded, 0 while pending or failed.
// A failed load is not an error state for the caller: every lookup path falls
// back to the model's own estimate, which is what the app did before this
// module existed.
function useFoodDB() {
  const [n, setN] = React.useState(() => (_foods ? _foods.length : 0));
  React.useEffect(() => {
    let alive = true;
    ensureFoodDB().then(c => { if (alive) setN(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return n;
}
