// ════════════════════════════════════════════════════════════════════
// 16-tips-creative.jsx — 80 tips × 5 personas × 2 genders (v3.20 lean)
// ════════════════════════════════════════════════════════════════════
//
// The 80-tip catalog (~412 KB raw, ~365 KB JSON) lives in
// /data/tips-creative.json and is fetched on demand. This module keeps
// only the CAT_LABELS table (sub-1 KB), the resolve / rotation helpers,
// and the two React components that consume the data — total ~6 KB.
//
// Loading model:
//   • CreativeTipOfDay   — fetched on mount; renders nothing until the
//     JSON lands (no skeleton needed — the card is non-blocking).
//   • CreativeTipsLibrary — fetched on mount; shows "טוען טיפים..." until
//     ready (the user opened the screen explicitly so a brief spinner
//     is the right UX rather than a blank list).

const CAT_LABELS = {
  scale:     'מאזניים',
  nutrition: 'תזונה',
  behavior:  'התנהגות',
  israeli:   'ישראלי',
  tracking:  'מעקב',
  myths:     'מיתוסים',
  strategy:  'אסטרטגיה',
};

// ─── Resolve tip content for current user's persona + gender ───────
function resolveTipVoice(tip, state) {
  const personaId = state?.settings?.persona || 'neutral';
  const gender = state?.user?.gender === 'female' ? 'female' : 'male';
  const name = (state?.user?.name || '').trim();

  const personaVoices = tip.voices?.[personaId] || tip.voices?.neutral || {};
  const genderVoice = personaVoices[gender] || personaVoices.male || {};

  // Runtime name substitution: replace "אלון" or "מירב" placeholder with actual user name
  let title = genderVoice.title || '';
  let body = genderVoice.body || '';
  if (name) {
    const placeholder = gender === 'female' ? 'מירב' : 'אלון';
    if (name !== placeholder) {
      const re = new RegExp(placeholder, 'g');
      title = title.replace(re, name);
      body  = body.replace(re, name);
    }
  }
  return { title, body };
}

// ─── Tips rotation: never repeat until all shown ───────────────────
// `tips` is the full CREATIVE_TIPS array (the data file content).
// Returns null when called before the data has loaded.
function getNextTipFrom(tips, state) {
  if (!Array.isArray(tips) || tips.length === 0) return null;
  const shown = state?.settings?.tipsShown || [];
  const available = tips.filter(t => !shown.includes(t.id));
  if (available.length === 0) {
    const t = tips[Math.floor(Math.random() * tips.length)];
    return { tip: t, voice: resolveTipVoice(t, state), resetHistory: true };
  }
  // Deterministic by date — same tip per day
  const today = todayISO();
  const d = new Date(today + 'T00:00:00Z');
  const daysSinceEpoch = Math.floor(d.getTime() / (24 * 3600 * 1000));
  const t = available[daysSinceEpoch % available.length];
  return { tip: t, voice: resolveTipVoice(t, state), resetHistory: false };
}

// ─── Tip of day card ──────────────────────────────────────────────
function CreativeTipOfDay({ onExpand }) {
  const { state, dispatch } = useStore();
  const [expanded, setExpanded] = React.useState(false);
  // v3.20: fetch CREATIVE_TIPS lazily. While the JSON is loading we
  // render nothing (the card simply doesn't appear yet — better than
  // a flickery skeleton in a slot that's optional anyway).
  const tips = useData('tips-creative');

  const next = React.useMemo(
    () => getNextTipFrom(tips, state),
    [tips, state.settings.persona, state.settings.tipsShown?.length, state.user?.gender, state.user?.name]
  );

  if (!next) return null;
  const { tip, voice, resetHistory } = next;

  const handleExpand = () => {
    if (!expanded) {
      if (resetHistory) dispatch({ type: 'RESET_TIPS_SHOWN' });
      dispatch({ type: 'MARK_TIP_SHOWN', tipId: tip.id });
    }
    setExpanded(v => !v);
    if (onExpand) onExpand();
  };

  return (
    <Card padding={14} style={{
      marginBottom: 14, cursor: 'pointer',
      background: `linear-gradient(135deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)`,
      border: `1px solid ${T.stroke}`,
    }} onClick={handleExpand}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `${T.amber}22`, color: T.amber,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TabIcon name="lightbulb" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 4 }}>
            טיפ היום · {CAT_LABELS[tip.category] || tip.category}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.4, marginBottom: expanded ? 8 : 0 }}>
            {voice.title}
          </div>
          {expanded && (
            <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.8, marginTop: 8 }}>
              {voice.body}
            </div>
          )}
          {!expanded && (
            <div style={{ fontSize: 11, color: T.inkMute, marginTop: 4 }}>לחץ להרחבה</div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Full tips library with persona-aware content ──────────────────
function CreativeTipsLibrary({ onClose }) {
  const { state } = useStore();
  const [filter, setFilter] = React.useState('all');
  // v3.20: lazy-loaded. Show a spinner until the JSON arrives — the user
  // opened this screen on purpose, so a quiet skeleton is appropriate.
  const tips = useData('tips-creative');
  const categories = ['all', ...Object.keys(CAT_LABELS)];
  const filtered = !tips
    ? []
    : (filter === 'all' ? tips : tips.filter(t => t.category === filter));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 800,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>טיפים</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {tips ? `${tips.length} תובנות` : 'טוען טיפים…'}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 18px 6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            display: 'inline-block', marginLeft: 6, padding: '6px 12px', fontSize: 12,
            borderRadius: 999, border: `1px solid ${filter === cat ? T.lime : T.stroke}`,
            background: filter === cat ? T.lime : 'transparent',
            color: filter === cat ? T.bg : T.inkSub,
            fontFamily: T.font, cursor: 'pointer', fontWeight: filter === cat ? 700 : 500,
          }}>
            {cat === 'all' ? 'הכל' : CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}>
        {!tips ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: T.inkMute, fontSize: 13 }}>
            טוען טיפים…
          </div>
        ) : (
          filtered.map(tip => {
            const voice = resolveTipVoice(tip, state);
            return (
              <Card key={tip.id} padding={14} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>
                  {CAT_LABELS[tip.category] || tip.category}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6, lineHeight: 1.4 }}>
                  {voice.title}
                </div>
                <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.8 }}>
                  {voice.body}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
