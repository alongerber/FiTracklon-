// ════════════════════════════════════════════════════════════════════
// 18-strings.jsx — UI strings (5 personas × 2 genders) — v3.20 lean
// ════════════════════════════════════════════════════════════════════
//
// The actual ~50 KB string data lives in /data/strings.json now and is
// fetched once at App boot via the data loader (see 04b-data-loader.jsx).
// This module keeps only the lookup helpers (personaStr, interpolateVars,
// getSincerityLine + the small SINCERITY_LINES table) which together
// weigh ~5 KB.
//
// While strings.json is in flight (first ~100ms of a cold load), every
// personaStr() call returns the inline `fallback` arg interpolated with
// any `vars` — i.e. the generic Hebrew text shipped at the call site.
// Once the JSON arrives, App boot dispatches MARK_DATA_LOADED so the
// store re-renders and persona-flavored strings take over.

// ─── Sincerity moments: small, kept inline (sub-1 KB) ───────────────
// Every N interactions, persona drops the mask once. Returns null
// when it's not a sincerity moment.
const SINCERITY_EVERY = 20;

const SINCERITY_LINES = {
  polish_mom: {
    male:   'אלון... תקשיב רגע. אני באמת גאה בך. אבא היה גאה.',
    female: 'מירב... תקשיבי רגע. אני באמת גאה בך. אמא הייתה גאה.',
  },
  salesman: {
    male:   'אלון, די עם המכירות. באמת — אתה עושה עבודה טובה.',
    female: 'מירב, די עם המכירות. באמת — את עושה עבודה טובה.',
  },
  cynic_coach: {
    male:   'תשמע. ברצינות. אתה עושה את זה טוב. תמשיך.',
    female: 'תשמעי. ברצינות. את עושה את זה טוב. תמשיכי.',
  },
  jealous_friend: {
    male:   'אחי, תשמע. באמת. אני מעריך אותך. תמשיך, אל תאבד את זה.',
    female: 'אחותי, תשמעי. באמת. אני מעריכה אותך. תמשיכי, אל תאבדי את זה.',
  },
  // neutral never gets sincerity — it's already sincere
};

function getSincerityLine(state) {
  const personaId = state?.settings?.persona || 'neutral';
  if (personaId === 'neutral') return null;

  const counter = state?.settings?.personaInteractions || 0;
  // Fire on interaction count 20, 40, 60, ...
  if (counter > 0 && counter % SINCERITY_EVERY === 0) {
    const gender = state?.user?.gender === 'female' ? 'female' : 'male';
    const name = (state?.user?.name || '').trim();
    const linesForPersona = SINCERITY_LINES[personaId];
    if (!linesForPersona) return null;
    let line = linesForPersona[gender] || linesForPersona.male;
    if (name) {
      const placeholder = gender === 'female' ? 'מירב' : 'אלון';
      if (name !== placeholder) {
        line = line.replace(new RegExp(placeholder, 'g'), name);
      }
    }
    return line;
  }
  return null;
}

// ─── Resolve a UI string for current user's persona + gender + name ──
// vars: optional { X: 5, Y: 2, ... } to substitute {X}, {Y}, etc.
//
// v3.20: STRINGS now lives in /data/strings.json, fetched async. Until
// the JSON lands (~100ms cold start), every call returns the inline
// `fallback` interpolated with `vars`. The first call also kicks off
// the load if it hasn't started yet — App.jsx's boot useEffect normally
// gets there first, but this defensive trigger ensures correctness even
// if some component renders before App's effect runs.
function personaStr(state, key, fallback = '', vars = null) {
  // Best-effort warm-up if loader is in scope and load hasn't started yet
  if (typeof loadData === 'function' && typeof getDataSync === 'function') {
    if (!getDataSync('strings')) {
      // Don't block — fire-and-forget. App boot also calls prefetchData('strings').
      loadData('strings').catch(() => {});
    }
  }
  const STRINGS = (typeof getDataSync === 'function') ? getDataSync('strings') : null;
  if (!STRINGS) return interpolateVars(fallback, vars);

  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const name = (state?.user?.name || '').trim();

  const entry = STRINGS[key];
  if (!entry) return interpolateVars(fallback, vars);

  const personaEntry = entry[personaId] || entry.neutral;
  if (!personaEntry) return interpolateVars(fallback, vars);

  let text = personaEntry[gender] || personaEntry.male || fallback;

  // Runtime name substitution
  if (name) {
    const placeholder = gender === 'female' ? 'מירב' : 'אלון';
    if (name !== placeholder) {
      text = text.replace(new RegExp(placeholder, 'g'), name);
    }
  }

  return interpolateVars(text, vars);
}

// ─── Substitute {X}, {Y}, etc. in a template string ─────────────────
// Used by personaStr; safe to call with null/undefined vars (returns text as-is).
function interpolateVars(text, vars) {
  if (!vars || !text) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
  });
}
