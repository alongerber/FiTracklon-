// ════════════════════════════════════════════════════════════════════
// 01-theme.jsx — Design tokens + date/format helpers
// ════════════════════════════════════════════════════════════════════

const T = {
  bg:        '#0b0d0c',
  bgElev:    '#141816',
  bgElev2:   '#1c211e',
  stroke:    'rgba(255,255,255,0.10)',
  strokeHi:  'rgba(255,255,255,0.20)',
  ink:       '#f4f6f2',
  inkSub:    'rgba(244,246,242,0.82)',
  inkMute:   'rgba(244,246,242,0.60)',
  lime:      '#c6ff3d',
  limeDim:   'rgba(198,255,61,0.18)',
  amber:     '#ffb94a',
  rose:      '#ff5b7a',
  cyan:      '#5ce1ff',
  violet:    '#b38bff',
  font:      '"Heebo", "Rubik", -apple-system, system-ui, sans-serif',
  mono:      '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  radius:    12,
  radiusL:   18,
  radiusXL:  28,
};

// ─── Date utilities (local-time, YYYY-MM-DD string keys) ─────────────
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function addDaysISO(iso, delta) {
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function daysBetweenISO(a, b) {
  const [ay,am,ad] = a.split('-').map(Number);
  const [by,bm,bd] = b.split('-').map(Number);
  const da = new Date(ay, am-1, ad);
  const db = new Date(by, bm-1, bd);
  return Math.round((db - da) / 86400000);
}
function parseDOWFromISO(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d).getDay();
}

// ─── Format helpers ──────────────────────────────────────────────────
const fmt = {
  kg: (n, unit = 'kg') => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return unit === 'lb' ? (n * 2.20462).toFixed(1) : n.toFixed(1);
  },
  unitLabel: (unit) => unit === 'lb' ? 'lb' : 'ק״ג',
  signed: (n) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1);
  },
  day: (iso) => {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    const days = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
    return `${days[dt.getDay()]} · ${dt.getDate()}.${dt.getMonth()+1}`;
  },
  dayShort: (iso) => {
    if (!iso) return '—';
    const [y,m,d] = iso.split('-').map(Number);
    return `${d}.${m}`;
  },
  relativeDay: (iso) => {
    const diff = daysBetweenISO(iso, todayISO());
    if (diff === 0) return 'היום';
    if (diff === 1) return 'אתמול';
    if (diff === -1) return 'מחר';
    if (diff < 7) return `לפני ${diff} ימים`;
    if (diff < 30) return `לפני ${Math.round(diff/7)} שבועות`;
    return `לפני ${Math.round(diff/30)} חודשים`;
  },
};

// ─── UUID ───────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
