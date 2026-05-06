// ════════════════════════════════════════════════════════════════════
// 04b-data-loader.jsx — async loader for externalized data files (v3.20)
// ════════════════════════════════════════════════════════════════════
//
// We split three large data structures (CREATIVE_TIPS, STRINGS, AI_PROMPTS)
// out of the JS bundle and into /data/*.json files served by Vercel +
// cached by the service worker. This shaved ~250 KB off the initial
// bundle parse cost.
//
// API:
//   loadData(key) -> Promise<data>      // fetches once, caches forever
//   getDataSync(key) -> data | null     // synchronous read of the cache
//   useData(key) -> data | null         // React hook: kicks off load,
//                                       // re-renders when ready
//   prefetchData(...keys)               // fire-and-forget warm-up
//
// Concurrency: parallel calls for the same key share one in-flight
// promise (de-duplicated via _dataPending). Failures are logged but
// not surfaced — callers fall back to inline defaults (e.g., personaStr
// returns its `fallback` arg until strings.json arrives).
//
// Cache strategy: HTTP cache=force-cache so the browser hands us the
// SW-cached copy on cold start. SW (sw.js) caches /data/*.json into the
// 'mishkalut-vNNN' cache on first fetch — see sw.js fetch handler.

const _dataCache    = {};   // key -> data
const _dataPending  = {};   // key -> Promise (in-flight)
const _dataSubs     = new Set(); // (key, data) => void

// Some calls happen before React mounts (module-level code in
// 18-strings.jsx during the personaStr first call window) — handle the
// case where window/fetch may not exist (tests, SSR, weird sandboxes).
function _hasFetch() {
  return typeof window !== 'undefined' && typeof window.fetch === 'function';
}

function loadData(key) {
  if (_dataCache[key])  return Promise.resolve(_dataCache[key]);
  if (_dataPending[key]) return _dataPending[key];
  if (!_hasFetch())     return Promise.reject(new Error('no fetch'));

  // `force-cache` — prefer the SW-cached copy on repeat visits, even when
  // the browser thinks the resource is stale. The cache key is the URL,
  // and the URL doesn't change between deploys for the same data file
  // (we'd ship a new SW cache version if the data changed).
  const url = './data/' + key + '.json';
  _dataPending[key] = fetch(url, { cache: 'force-cache' })
    .then(r => {
      if (!r.ok) throw new Error('Failed to load ' + key + ' (' + r.status + ')');
      return r.json();
    })
    .then(data => {
      _dataCache[key] = data;
      delete _dataPending[key];
      _dataSubs.forEach(fn => { try { fn(key, data); } catch (_) {} });
      return data;
    })
    .catch(err => {
      delete _dataPending[key];
      // Don't throw uncaught — callers handle Promise rejection or use the
      // sync getter, which returns null and they substitute a fallback.
      console.warn('[loadData]', key, err && err.message);
      throw err;
    });
  return _dataPending[key];
}

// Synchronous read — returns null until loadData has resolved.
// Used inside personaStr/getNextTipFor/etc. where we can't await.
function getDataSync(key) { return _dataCache[key] || null; }

// Subscribe to load completions (fires once per key as it lands).
// Returns an unsubscribe fn. Used by App boot to dispatch
// MARK_DATA_LOADED so components re-render with the fresh strings.
function onDataLoaded(fn) {
  _dataSubs.add(fn);
  return () => _dataSubs.delete(fn);
}

// React hook for components that NEED the data to render meaningfully
// (e.g., CreativeTipOfDay, CreativeTipsLibrary). Returns null while the
// fetch is in flight so the caller can show a small loading state.
function useData(key) {
  const [data, setData] = React.useState(() => _dataCache[key] || null);
  React.useEffect(() => {
    if (_dataCache[key]) {
      // Already cached — sync state in case it changed (e.g., a refetch)
      if (data !== _dataCache[key]) setData(_dataCache[key]);
      return;
    }
    let alive = true;
    loadData(key).then(d => { if (alive) setData(d); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}

// Fire-and-forget prefetcher used at App boot to warm the cache for
// data we'll definitely need (strings) and data we'll likely need
// (tips for the home tip card). AI prompts are NOT prefetched — they're
// only needed when the user clicks "generate" on an insight.
function prefetchData(...keys) {
  for (const key of keys) {
    if (!_dataCache[key] && !_dataPending[key]) {
      loadData(key).catch(() => {}); // swallow — best-effort
    }
  }
}
