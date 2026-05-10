// ════════════════════════════════════════════════════════════════════
// 03-charts.jsx — SVG charts, adapted to real (sparse) data
// ════════════════════════════════════════════════════════════════════

// v3.23.3 fix #7 (CRITICAL): index-based x positioning made 5 weighings
// across 30 days look like 5 weighings on consecutive days — the user
// could not tell sparse from dense data. catmull-rom smoothing made the
// problem worse by drawing graceful curves through gaps that don't
// represent any real trend. Two functions now:
//   • toPointsByDate — x by real ISO date, fallback to index for non-time data
//   • straightPath — straight-line segments only, with a `breakOnGap` mode
//     that splits the path on long absences so the user sees them.

function _isoToDays(iso) {
  // Convert YYYY-MM-DD to a numeric day count (UTC) for ratio math
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function toPoints(data, key, w, h, padT = 10, padB = 10, yMin, yMax) {
  if (!data.length) return [];
  const vals = data.map(d => d[key]);
  const lo = yMin ?? Math.min(...vals);
  const hi = yMax ?? Math.max(...vals);
  const rng = hi - lo || 1;
  return data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = padT + (1 - (d[key] - lo) / rng) * (h - padT - padB);
    return [x, y, d];
  });
}

// v3.23.3 fix #7: position points by real ISO date instead of array index.
// Each entry must have .date as an ISO YYYY-MM-DD string. If all dates are
// the same (or only one point), falls back to spreading evenly across the
// width (matches the legacy index-based behavior for the 1-point case).
function toPointsByDate(data, key, w, h, padT = 10, padB = 10, yMin, yMax) {
  if (!data.length) return [];
  const vals = data.map(d => d[key]);
  const lo = yMin ?? Math.min(...vals);
  const hi = yMax ?? Math.max(...vals);
  const rng = hi - lo || 1;
  const dayNums = data.map(d => _isoToDays(d.date));
  const dMin = Math.min(...dayNums);
  const dMax = Math.max(...dayNums);
  const dRng = (dMax - dMin) || 1;
  return data.map((d, i) => {
    const x = ((dayNums[i] - dMin) / dRng) * w;
    const y = padT + (1 - (d[key] - lo) / rng) * (h - padT - padB);
    return [x, y, d];
  });
}

// v3.23.3 fix #7: straight-line path. Optionally splits the path into
// multiple sub-paths whenever the gap between consecutive ISO dates
// exceeds gapDays — this is what makes sparse data visually honest:
// 5 weighings across 30 days no longer look like a continuous downhill.
// Each break starts a new "M" command so SVG renders a visible discontinuity.
function straightPath(pts, opts = {}) {
  if (!pts.length) return '';
  const gapDays = opts.gapDays || 0;
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1][2];
    const curr = pts[i][2];
    const breakHere = gapDays > 0 && prev?.date && curr?.date
      && (_isoToDays(curr.date) - _isoToDays(prev.date)) > gapDays;
    if (breakHere) {
      d += ` M${pts[i][0]} ${pts[i][1]}`;
    } else {
      d += ` L${pts[i][0]} ${pts[i][1]}`;
    }
  }
  return d;
}

// Detect long-absence gaps in a sorted-by-date list of entries. Returns
// the number of gaps > minGap days. Used by the chart to surface a
// caption like "יש gaps של 12 יום בנתונים" instead of pretending continuity.
function _maxGapDays(data) {
  if (!data || data.length < 2) return 0;
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1]?.date, b = data[i]?.date;
    if (!a || !b) continue;
    const g = _isoToDays(b) - _isoToDays(a);
    if (g > max) max = g;
  }
  return max;
}

function WeightChart({
  data, goal, width = 360, height = 180,
  stroke = T.lime, fill = true, showGoal = true, showMarkers = true,
  showGrid = true, showDots = true, yPad = 1.0,
  // v3.23.3: a gap of >7 days between consecutive entries breaks the line
  // (no false connection across long absences). Set to 0 to disable.
  breakGapDays = 7,
  // v3.23.3: when true, the area-fill is suppressed if any gap exceeds
  // breakGapDays — a fill across a gap visually re-connects what the
  // broken line is trying to disconnect.
  honestFill = true,
}) {
  const w = width, h = height;
  if (!data || data.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        <rect x="0" y="0" width={w} height={h} fill="none" stroke={T.stroke} strokeDasharray="4 4" />
        <text x={w/2} y={h/2} textAnchor="middle" fill={T.inkMute} style={{ fontFamily: T.font, fontSize: 13 }}>
          אין עדיין נתונים
        </text>
      </svg>
    );
  }

  // v3.23.3 fix #7: ensure data is sorted by date before any positioning,
  // otherwise gap detection and x-by-date both produce nonsense.
  const sorted = data.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const vals = sorted.map(d => d.weight);
  const lo = Math.min(...vals, goal ?? Infinity) - yPad;
  const hi = Math.max(...vals, goal ?? -Infinity) + yPad;
  // x-by-date positions points proportional to real time elapsed.
  const pts = toPointsByDate(sorted, 'weight', w, h, 12, 16, lo, hi);
  // Straight lines, broken on >breakGapDays absences (no smoothing curves).
  const path = straightPath(pts, { gapDays: breakGapDays });
  const maxGap = _maxGapDays(sorted);
  const hasBigGap = breakGapDays > 0 && maxGap > breakGapDays;
  // Area fill: only safe if there are no big gaps; otherwise omit.
  const areaPath = (!hasBigGap && pts.length > 1)
    ? straightPath(pts, { gapDays: 0 }) + ` L${w} ${h} L0 ${h} Z`
    : null;
  const gy = goal !== null && goal !== undefined
    ? 12 + (1 - (goal - lo) / (hi - lo)) * (h - 28) : null;

  const peakI = vals.indexOf(Math.max(...vals));
  const lowI  = vals.indexOf(Math.min(...vals));

  const gid = React.useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}
      style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showGrid && (
        <g opacity="0.5">
          {[0.25, 0.5, 0.75].map((p, i) => (
            <line key={i} x1="0" x2={w} y1={12 + p * (h - 28)} y2={12 + p * (h - 28)}
              stroke={T.stroke} strokeDasharray="2 4" />
          ))}
        </g>
      )}

      {showGoal && gy !== null && (
        <g>
          <line x1="0" x2={w} y1={gy} y2={gy} stroke={T.amber} strokeDasharray="3 3" strokeWidth="1" opacity="0.7" />
          <text x={w - 4} y={gy - 4} textAnchor="end" fill={T.amber}
            style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 0.5 }}>
            יעד {goal}
          </text>
        </g>
      )}

      {fill && areaPath && (!honestFill || !hasBigGap) && (
        <path d={areaPath} fill={`url(#fill-${gid})`} />
      )}
      {pts.length > 1 && <path d={path} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}

      {(showDots || pts.length === 1) && pts.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={pts.length === 1 ? 4 : 2.4} fill={stroke} opacity="0.85" />
      ))}

      {showMarkers && sorted.length > 2 && (
        <g>
          <circle cx={pts[peakI][0]} cy={pts[peakI][1]} r="4" fill={T.rose} />
          <circle cx={pts[peakI][0]} cy={pts[peakI][1]} r="8" fill="none" stroke={T.rose} strokeWidth="1" opacity="0.4" />
          <circle cx={pts[lowI][0]} cy={pts[lowI][1]} r="4" fill={T.lime} />
          <circle cx={pts[lowI][0]} cy={pts[lowI][1]} r="8" fill="none" stroke={T.lime} strokeWidth="1" opacity="0.4" />
        </g>
      )}

      {pts.length > 0 && (
        <>
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="5" fill={T.ink} />
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="5" fill="none" stroke={stroke} strokeWidth="2" />
        </>
      )}

      {/* v3.23.3 fix #7: visible gap warning so the user knows the chart
          isn't pretending to fill in missing days. */}
      {hasBigGap && (
        <text x={w - 4} y={h - 4} textAnchor="end" fill={T.amber}
          style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 0.4 }}>
          gap של {maxGap} ימים בנתונים
        </text>
      )}
    </svg>
  );
}

function Sparkline({ data, width = 80, height = 28, stroke = T.lime, fill = true }) {
  const w = width, h = height;
  if (!data || data.length === 0) {
    return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}><line x1="0" y1={h/2} x2={w} y2={h/2} stroke={T.stroke} strokeDasharray="2 3"/></svg>;
  }
  // v3.23.3 fix #7: sparklines also use date-aware x positioning + straight
  // lines (no catmull-rom smoothing). Sorted defensively so callers passing
  // out-of-order data get correct results.
  const sorted = data.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const vals = sorted.map(d => d.weight);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const hasDates = sorted.every(d => !!d.date);
  const pts = hasDates
    ? toPointsByDate(sorted, 'weight', w, h, 4, 4, lo, hi)
    : toPoints(sorted, 'weight', w, h, 4, 4, lo, hi);
  // For sparklines we keep a continuous line (no break-on-gap) — they're
  // tiny glanceable summaries, the larger chart has the honest break.
  const path = straightPath(pts, { gapDays: 0 });
  const gid = React.useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={width} height={height} style={{ display:'block' }}>
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && pts.length > 1 && <path d={path + ` L${w} ${h} L0 ${h} Z`} fill={`url(#sp-${gid})`} />}
      {pts.length > 1 && <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />}
      {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r="2.5" fill={stroke} />}
    </svg>
  );
}

function BarHistogram({ data, width = 360, height = 120, color = T.lime }) {
  const w = width, h = height;
  if (!data || data.length === 0) return null;
  const vals = data.map(d => d.weight);
  const lo = Math.min(...vals) - 0.2, hi = Math.max(...vals) + 0.2;
  const barW = Math.max(1.5, (w / data.length) * 0.55);
  const gap  = (w / data.length) - barW;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display:'block' }}>
      {data.map((d, i) => {
        const x = i * (barW + gap);
        const y = 4 + (1 - (d.weight - lo) / (hi - lo || 1)) * (h - 8);
        const barH = h - y - 2;
        const isLast = i === data.length - 1;
        return (
          <rect key={i} x={x} y={y} width={barW} height={barH} rx={Math.min(1.5, barW/2)}
            fill={isLast ? T.ink : color} opacity={isLast ? 1 : 0.7} />
        );
      })}
    </svg>
  );
}

function RingGauge({ pct = 50, size = 120, stroke = 10, color = T.lime, track = T.stroke, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Workout volume bar chart (4-week buckets) ──────────────────────
// Expects buckets = [{ label, volume }, ...] oldest→newest.
// Highlights the LAST bucket (current week) with T.ink, like BarHistogram.
function WorkoutVolumeChart({ buckets, width = 340, height = 110, color = T.lime }) {
  const w = width, h = height;
  if (!buckets || buckets.length === 0) return null;

  const padT = 14, padB = 22; // padB leaves room for x-axis labels
  const chartH = h - padT - padB;
  const vols = buckets.map(b => b.volume);
  const hi = Math.max(...vols, 1);

  const slot = w / buckets.length;
  const barW = Math.max(8, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      {/* Subtle baseline */}
      <line x1="0" x2={w} y1={h - padB + 1} y2={h - padB + 1} stroke={T.stroke} />

      {buckets.map((b, i) => {
        const isLast = i === buckets.length - 1;
        const x = i * slot + (slot - barW) / 2;
        const ratio = b.volume / hi;
        const barH = Math.max(2, ratio * chartH);
        const y = h - padB - barH;

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={Math.min(3, barW / 2)}
              fill={isLast ? T.ink : color}
              opacity={isLast ? 1 : 0.7}
            />
            {b.volume > 0 && (
              <text
                x={x + barW / 2} y={y - 4} textAnchor="middle"
                fill={isLast ? T.ink : T.inkSub}
                style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600 }}
              >
                {b.volume >= 1000 ? `${(b.volume / 1000).toFixed(1)}k` : b.volume}
              </text>
            )}
            <text
              x={x + barW / 2} y={h - 6} textAnchor="middle"
              fill={isLast ? T.ink : T.inkMute}
              style={{ fontFamily: T.font, fontSize: 10, fontWeight: isLast ? 700 : 500 }}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Workout frequency stacked horizontal bar (by category) ─────────
// Expects items = [{ id, label, color, count }] only with count > 0.
function WorkoutFrequencyChart({ items, width = 340, barHeight = 18 }) {
  if (!items || items.length === 0) return null;
  const total = items.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;

  // Build segments with explicit x offsets in % so stroke between segments is clean
  let acc = 0;
  const segs = items.map(it => {
    const pct = (it.count / total) * 100;
    const seg = { ...it, x: acc, w: pct };
    acc += pct;
    return seg;
  });

  const w = width;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Stacked bar */}
      <svg viewBox={`0 0 ${w} ${barHeight}`} width="100%" height={barHeight} style={{ display: 'block' }}>
        <rect x="0" y="0" width={w} height={barHeight} rx={barHeight / 2} fill={T.bgElev2} />
        <clipPath id={`mk-freq-clip-${React.useId().replace(/:/g, '')}`}>
          <rect x="0" y="0" width={w} height={barHeight} rx={barHeight / 2} />
        </clipPath>
        {segs.map((s, i) => (
          <rect
            key={s.id}
            x={(s.x / 100) * w}
            y="0"
            width={Math.max(2, (s.w / 100) * w)}
            height={barHeight}
            fill={s.color}
            opacity="0.9"
          />
        ))}
      </svg>

      {/* Legend */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 14px',
      }}>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 5, background: it.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: T.inkSub, flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{it.label}</span>
            <span style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>
              {it.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArcGauge({ value = 0.5, min = -1, max = 1, size = 220, color = T.lime }) {
  const t = (value - min) / (max - min);
  const tc = Math.max(0, Math.min(1, t));
  const start = -Math.PI;
  const end = 0;
  const ang = start + tc * (end - start);
  const r = size/2 - 18;
  const cx = size/2, cy = size/2;
  const arc = (a0, a1) => {
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `M${x0} ${y0} A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size/2 + 20}`} width="100%" style={{ display: 'block' }}>
      <path d={arc(start, end)} fill="none" stroke={T.stroke} strokeWidth="14" strokeLinecap="round" />
      <path d={arc(start, ang)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy - r + 10} stroke={T.inkMute} strokeWidth="2" />
    </svg>
  );
}
