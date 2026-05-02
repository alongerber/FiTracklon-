// ════════════════════════════════════════════════════════════════════
// 04-ui.jsx — UI primitives + dialogs + toasts
// ════════════════════════════════════════════════════════════════════

function Card({ children, style, padding = 16, ...rest }) {
  return (
    <div style={{
      background: T.bgElev, borderRadius: T.radius,
      border: `1px solid ${T.stroke}`, padding,
      ...style,
    }} {...rest}>{children}</div>
  );
}

function Row({ children, style, gap = 12, align = 'center', justify = 'flex-start', ...rest }) {
  return (
    <div style={{ display:'flex', gap, alignItems: align, justifyContent: justify, ...style }} {...rest}>
      {children}
    </div>
  );
}

function Col({ children, style, gap = 12, ...rest }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap, ...style }} {...rest}>
      {children}
    </div>
  );
}

function StatChip({ label, value, unit, sub, color = T.lime, icon }) {
  return (
    <Card padding={14} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: T.inkSub, letterSpacing: 0.3 }}>{label}</div>
        {icon}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap: 4 }}>
        <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: -0.5 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: T.inkMute }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function Pill({ children, color = T.lime, filled = false, size = 'md' }) {
  const fs = size === 'sm' ? 10 : 12;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap: 6,
      padding: size === 'sm' ? '3px 8px' : '5px 10px',
      background: filled ? color : 'transparent',
      color: filled ? T.bg : color,
      border: `1px solid ${filled ? color : color + '66'}`,
      borderRadius: 999, fontSize: fs, fontWeight: 600, letterSpacing: 0.3,
      fontFamily: T.font,
    }}>
      {!filled && <span style={{ width: 5, height: 5, borderRadius: 5, background: color }} />}
      {children}
    </span>
  );
}

function DeltaBadge({ value, unit = 'ק״ג', good = 'down', size = 'md' }) {
  if (value === null || value === undefined || isNaN(value)) {
    return <span style={{ color: T.inkMute, fontSize: size==='sm'?11:13, fontFamily: T.mono }}>—</span>;
  }
  const isDown = value < -0.05;
  const isUp = value > 0.05;
  const positive = (good === 'down' && isDown) || (good === 'up' && isUp);
  const negative = (good === 'down' && isUp) || (good === 'up' && isDown);
  const color = positive ? T.lime : negative ? T.rose : T.inkMute;
  const arrow = isDown ? '↓' : isUp ? '↑' : '→';
  const fs = size === 'sm' ? 11 : 13;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap: 4,
      color, fontSize: fs, fontFamily: T.mono, fontWeight: 600,
    }}>
      <span>{arrow}</span>
      <span>{Math.abs(value).toFixed(1)}</span>
      {unit && <span style={{ opacity: 0.7 }}>{unit}</span>}
    </span>
  );
}

function TabBar({ active = 'home', onChange }) {
  const tabs = [
    { id: 'home',      label: 'בית',       icon: 'home' },
    { id: 'nutrition', label: 'תזונה',     icon: 'apple' },
    { id: 'log',       label: 'הזנה',      icon: 'plus' },
    { id: 'workout',   label: 'אימון',     icon: 'dumbbell' },
    { id: 'history',   label: 'היסטוריה',  icon: 'chart' },
    { id: 'me',        label: 'פרופיל',    icon: 'user' },
  ];
  return (
    <div style={{
      display:'flex', justifyContent:'space-around', alignItems:'center',
      padding: '6px 4px 2px', background: T.bg,
      borderTop: `1px solid ${T.stroke}`, flexShrink: 0,
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        const isAdd = t.id === 'log';
        if (isAdd) {
          // QA10: explicit label + plus icon, so the FAB is self-documenting.
          // Reduced from a circular icon-only button to a pill so the Hebrew
          // word fits without crowding the icon.
          return (
            <button key={t.id} onClick={() => onChange?.(t.id)} aria-label="הזנת שקילה" style={{
              border: 'none', cursor: 'pointer', padding: '8px 14px',
              height: 44, marginTop: -10,
              borderRadius: 22, background: T.lime, color: T.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: `0 6px 24px ${T.lime}55, 0 0 0 4px ${T.bg}`,
              fontFamily: T.font, fontSize: 13, fontWeight: 800,
            }}>
              <TabIcon name="plus" size={18} />
              שקילה
            </button>
          );
        }
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            border:'none', background:'transparent', cursor:'pointer',
            padding: '8px 2px', display:'flex', flexDirection:'column',
            alignItems:'center', gap: 2, flex: 1, minWidth: 0,
            color: on ? T.lime : T.inkMute,
          }}>
            <TabIcon name={t.icon} size={18} />
            <span style={{ fontSize: 10, fontFamily: T.font, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Tab icons — modern Lucide-style stroke SVGs
// ════════════════════════════════════════════════════════════════════

function TabIcon({ name, size = 18 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <svg {...p}>
        <path d="M3 10.5L12 3l9 7.5"/>
        <path d="M5 9.5V20a1 1 0 001 1h3.5v-6h5v6H18a1 1 0 001-1V9.5"/>
      </svg>;
    case 'plus':
      return <svg {...p} strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>;
    case 'chart':
      return <svg {...p}>
        <path d="M3 20h18"/>
        <rect x="5" y="13" width="3" height="7" rx="1"/>
        <rect x="10.5" y="8" width="3" height="12" rx="1"/>
        <rect x="16" y="4" width="3" height="16" rx="1"/>
      </svg>;
    case 'apple':
      return <svg {...p}>
        <path d="M12 6c-1-1-2.5-1.5-4-1C6 5.5 4 7.5 4 11c0 5 3 10 5.5 10 1 0 1.5-0.5 2.5-0.5s1.5 0.5 2.5 0.5c2.5 0 5.5-5 5.5-10 0-3.5-2-5.5-4-6-1.5-0.5-3 0-4 1z"/>
        <path d="M14 2c1 0 2 1 2 2 0 1-1 2-2 2"/>
      </svg>;
    case 'user':
      return <svg {...p}>
        <circle cx="12" cy="8" r="3.5"/>
        <path d="M4.5 21c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>
      </svg>;
    case 'settings':
      return <svg {...p}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>;
    case 'target':
      return <svg {...p}>
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      </svg>;
    case 'download':
      return <svg {...p}>
        <path d="M12 3v13M7 11l5 5 5-5M5 21h14"/>
      </svg>;
    case 'share':
      return <svg {...p}>
        <path d="M12 3v13M8 7l4-4 4 4M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/>
      </svg>;
    case 'sparkle':
      return <svg {...p}>
        <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>
      </svg>;
    case 'key':
      return <svg {...p}>
        <circle cx="8" cy="15" r="4"/>
        <path d="M10.85 12.15L21 2M18 5l3 3M15 8l3 3"/>
      </svg>;
    case 'wallet':
      return <svg {...p}>
        <path d="M20 12V8a2 2 0 00-2-2H5a2 2 0 010-4h13a2 2 0 012 2v4"/>
        <path d="M3 6v14a2 2 0 002 2h15a2 2 0 002-2v-4"/>
        <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
      </svg>;
    case 'lightbulb':
      return <svg {...p}>
        <path d="M9 18h6M10 21h4M12 2a7 7 0 00-4 12.5V17h8v-2.5A7 7 0 0012 2z"/>
      </svg>;
    case 'ruler':
      return <svg {...p}>
        <path d="M3 17L17 3l4 4L7 21l-4-4z"/>
        <path d="M7 11l2 2M11 7l2 2M15 15l2 2M10 14l2 2"/>
      </svg>;
    case 'bolt':
      return <svg {...p}>
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
      </svg>;
    case 'palette':
      return <svg {...p}>
        <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor"/>
        <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor"/>
        <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor"/>
        <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.8 1.5-1.7 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.4-10-8.4z"/>
      </svg>;
    case 'download-to-phone':
      return <svg {...p}>
        <rect x="7" y="2" width="10" height="20" rx="2"/>
        <path d="M12 5v8M9 10l3 3 3-3"/>
        <line x1="10" y1="19" x2="14" y2="19"/>
      </svg>;
    case 'trash':
      return <svg {...p}>
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      </svg>;
    case 'upload':
      return <svg {...p}>
        <path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>
      </svg>;
    case 'download-inv':
      return <svg {...p}>
        <path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>
      </svg>;
    case 'edit':
      return <svg {...p}>
        <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>;
    case 'dumbbell':
      return <svg {...p}>
        <path d="M2 12h2M6 8v8M6 12h12M18 8v8M20 12h2M9 6v12M15 6v12"/>
      </svg>;
    case 'flame':
      return <svg {...p}>
        <path d="M12 2c1.5 2.5 2 4 2 6 0-1-1-2-2-2s-2 1-2 2c0 0-1-1-1-3C6 7 4 10 4 14a8 8 0 0016 0c0-4-2.5-8-8-12z"/>
      </svg>;
    case 'star':
      return <svg {...p}>
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
      </svg>;
    case 'photo':
      return <svg {...p}>
        <rect x="3" y="5" width="18" height="15" rx="2"/>
        <circle cx="9" cy="11" r="2"/>
        <path d="M21 17l-5-5L5 20"/>
      </svg>;
    case 'chat':
      return <svg {...p}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>;
    case 'plate':
      return <svg {...p}>
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="5"/>
      </svg>;
    // ── BUG4 (v3.8): icons added to replace emoji in headers/CTAs ──
    case 'trophy':
      return <svg {...p}>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 4h10v5a5 5 0 0 1-10 0z"/>
        <path d="M17 4h3v3a3 3 0 0 1-3 3M7 4H4v3a3 3 0 0 0 3 3"/>
      </svg>;
    case 'clipboard-list':
      return <svg {...p}>
        <rect x="6" y="4" width="12" height="17" rx="2"/>
        <path d="M9 4h6v3H9z"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>;
    case 'search':
      return <svg {...p}>
        <circle cx="11" cy="11" r="7"/>
        <line x1="20" y1="20" x2="16.5" y2="16.5"/>
      </svg>;
    case 'zap':
      return <svg {...p}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>
      </svg>;
    case 'microphone':
      return <svg {...p}>
        <rect x="9" y="3" width="6" height="11" rx="3"/>
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>
      </svg>;
    case 'save':
      return <svg {...p}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <path d="M17 21v-8H7v8M7 3v5h8"/>
      </svg>;
    case 'play':
      return <svg {...p}>
        <path d="M6 4l14 8-14 8z" fill="currentColor"/>
      </svg>;
    default: return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// PWA Install Prompt — singleton capture + React hook
// ════════════════════════════════════════════════════════════════════

const _installState = {
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  prompt: null,
};
const _installSubs = new Set();

if (typeof window !== 'undefined') {
  _installState.isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '') && !window.MSStream;
  _installState.isInstalled =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    !!window.navigator.standalone;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installState.prompt = e;
    _installState.canInstall = true;
    _installSubs.forEach(fn => fn({ ..._installState }));
  });

  window.addEventListener('appinstalled', () => {
    _installState.isInstalled = true;
    _installState.canInstall = false;
    _installState.prompt = null;
    _installSubs.forEach(fn => fn({ ..._installState }));
  });
}

function useInstallPrompt() {
  const [st, setSt] = React.useState({ ..._installState });
  React.useEffect(() => {
    const fn = (s) => setSt(s);
    _installSubs.add(fn);
    return () => _installSubs.delete(fn);
  }, []);

  const install = async () => {
    if (!st.prompt) return false;
    try {
      st.prompt.prompt();
      const res = await st.prompt.userChoice;
      if (res.outcome === 'accepted') {
        _installState.isInstalled = true;
        _installState.canInstall = false;
        _installState.prompt = null;
        _installSubs.forEach(fn => fn({ ..._installState }));
      }
      return res.outcome === 'accepted';
    } catch (_) { return false; }
  };

  return { ...st, install };
}

// ─── iOS install instructions dialog ────────────────────────────────
function IOSInstallDialog({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 22, maxWidth: 360, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>התקנה באייפון</div>

        <div style={{ fontSize: 13, color: T.inkSub, lineHeight: 1.8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: `${T.lime}22`,
              color: T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>1</div>
            <div style={{ flex: 1 }}>לחץ על כפתור השיתוף <span style={{ fontFamily: T.mono, color: T.lime }}>⬆</span> בתחתית הדפדפן (Safari).</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: `${T.lime}22`,
              color: T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>2</div>
            <div style={{ flex: 1 }}>גלול ובחר <strong>"הוסף למסך הבית"</strong> / <strong>Add to Home Screen</strong>.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14, background: `${T.lime}22`,
              color: T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>3</div>
            <div style={{ flex: 1 }}>אשר "הוסף". האפליקציה תופיע במסך הבית ותיפתח כאפליקציה עצמאית.</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: T.inkMute, marginTop: 14, lineHeight: 1.6, padding: 10, background: T.bg, borderRadius: 8 }}>
          <strong>חשוב:</strong> רק Safari תומך בהתקנת PWA באייפון. אם אתה ב-Chrome — פתח את הקישור ב-Safari.
        </div>

        <div style={{ marginTop: 18 }}>
          <Button onClick={onClose}>הבנתי</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Install button — shows native prompt or iOS instructions ───────
function InstallButton({ variant = 'primary', label = 'התקן במסך הבית' }) {
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const [showIOS, setShowIOS] = React.useState(false);

  if (isInstalled) return null;

  // Show only if installable (Android/Chrome/Edge) OR iOS (show instructions)
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (isIOS) { setShowIOS(true); return; }
    await install();
  };

  const styles = variant === 'ghost' ? {
    background: 'transparent', color: T.lime,
    border: `1px solid ${T.lime}55`,
  } : {
    background: T.lime, color: T.bg, border: 'none',
    boxShadow: `0 4px 18px ${T.lime}33`,
  };

  return (
    <>
      <button onClick={handleClick} style={{
        ...styles,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '13px 20px', borderRadius: T.radius, cursor: 'pointer',
        fontSize: 14, fontWeight: 700, fontFamily: T.font, width: '100%',
      }}>
        <TabIcon name="download" size={18} />
        {label}
      </button>
      {showIOS && <IOSInstallDialog onClose={() => setShowIOS(false)} />}
    </>
  );
}

function AppTop({ title, subtitle, right, left, style }) {
  return (
    <div style={{
      padding: '14px 18px 10px', display:'flex', alignItems:'center',
      gap: 12, flexShrink: 0, ...style
    }}>
      {left}
      <div style={{ flex: 1 }}>
        {subtitle && <div style={{ fontSize: 11, color: T.inkMute, letterSpacing: 0.4 }}>{subtitle}</div>}
        <div style={{ fontSize: 18, color: T.ink, fontWeight: 700, fontFamily: T.font }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function AvatarDot({ letter = 'י', color = T.lime, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${T.amber})`,
      color: T.bg, display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight: 800, fontSize: size * 0.44, fontFamily: T.font,
      flexShrink: 0,
    }}>{letter}</div>
  );
}

function StreakBadge({ days = 0, color = T.amber }) {
  if (days === 0) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px 4px 8px', borderRadius: 999,
        background: T.stroke, color: T.inkMute,
        fontFamily: T.mono, fontSize: 11, fontWeight: 600,
      }}>התחל רצף</div>
    );
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 8px', borderRadius: 999,
      background: `${color}22`, color,
      fontFamily: T.mono, fontSize: 12, fontWeight: 700,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 4 3 4 7a6 6 0 0 1-12 0c0-5 6-7 6-13z"/>
      </svg>
      {days} ימים
    </div>
  );
}

function Div({ style }) {
  return <div style={{ height: 1, background: T.stroke, ...style }} />;
}

// ─── Button (primary) ───────────────────────────────────────────────
function Button({ children, onClick, disabled, variant = 'primary', style, type = 'button' }) {
  const base = {
    width: '100%', padding: '14px 20px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: T.font,
    transition: 'transform 80ms, opacity 120ms',
    opacity: disabled ? 0.5 : 1,
  };
  const styles = {
    primary:   { ...base, background: T.lime, color: T.bg, boxShadow: `0 6px 20px ${T.lime}40` },
    secondary: { ...base, background: T.bgElev2, color: T.ink, border: `1px solid ${T.stroke}` },
    ghost:     { ...base, background: 'transparent', color: T.ink, border: `1px solid ${T.stroke}` },
    danger:    { ...base, background: 'transparent', color: T.rose, border: `1px solid ${T.rose}44` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...styles[variant], ...style }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
      {children}
    </button>
  );
}

// ─── Toast system ───────────────────────────────────────────────────
const ToastContext = React.createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const show = React.useCallback((message, opts = {}) => {
    const id = uid();
    const t = {
      id,
      message,
      type: opts.type || 'info',
      duration: opts.duration ?? 2500,
      actionLabel: opts.actionLabel || null,
      onAction: opts.onAction || null,
    };
    setToasts(arr => [...arr, t]);
    setTimeout(() => setToasts(arr => arr.filter(x => x.id !== id)), t.duration);
  }, []);
  const dismiss = React.useCallback((id) => {
    setToasts(arr => arr.filter(x => x.id !== id));
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div style={{
        position: 'fixed', bottom: 100, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        zIndex: 1000, pointerEvents: 'none', padding: '0 20px',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 10,
            background: t.type === 'success' ? T.lime : t.type === 'error' ? T.rose : T.bgElev2,
            color: t.type === 'success' ? T.bg : T.ink,
            padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            fontFamily: T.font, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            maxWidth: 380, textAlign: 'center', direction: 'rtl',
            animation: 'mk-fadeup 180ms ease',
          }}>
            <div style={{ flex: 1 }}>{t.message}</div>
            {t.actionLabel && t.onAction && (
              <button onClick={() => { t.onAction(); dismiss(t.id); }} style={{
                background: 'transparent',
                border: `1.5px solid ${t.type === 'success' ? T.bg : T.ink}`,
                color: t.type === 'success' ? T.bg : T.ink,
                padding: '4px 12px', borderRadius: 8, fontSize: 12,
                fontWeight: 700, fontFamily: T.font, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>{t.actionLabel}</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const ctx = React.useContext(ToastContext);
  return ctx || (() => {});
}

// ─── Confirmation dialog ────────────────────────────────────────────
function ConfirmDialog({ open, title, message, confirmLabel = 'אשר', cancelLabel = 'ביטול', onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 900, padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 24, maxWidth: 340, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{title}</div>
        {message && <div style={{ fontSize: 13, color: T.inkSub, marginBottom: 20, lineHeight: 1.5 }}>{message}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────
function EmptyState({ icon = '📊', title, message, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', textAlign: 'center', gap: 10, direction: 'rtl',
    }}>
      <div style={{ fontSize: 48, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</div>
      {message && <div style={{ fontSize: 13, color: T.inkSub, maxWidth: 280, lineHeight: 1.5 }}>{message}</div>}
      {action && <div style={{ marginTop: 10, width: '100%' }}>{action}</div>}
    </div>
  );
}

// ─── Loading skeleton — animated lines that mimic content ──────────
function SkeletonLines({ lines = 3, height = 12, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, padding: '4px 0' }}>
      <style>{`
        @keyframes mishkalut-skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
      `}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height,
          width: i === lines - 1 ? '60%' : (i % 2 === 0 ? '95%' : '85%'),
          background: `linear-gradient(90deg, ${T.bgElev} 0%, ${T.bgElev2} 50%, ${T.bgElev} 100%)`,
          backgroundSize: '200% 100%',
          borderRadius: 6,
          animation: 'mishkalut-skeleton-pulse 1.4s ease-in-out infinite',
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

// ─── Loading text with persona — for AI insight loading ────────────
function LoadingPersona({ message = 'טוען...' }) {
  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ fontSize: 12, color: T.inkSub, marginBottom: 10, fontStyle: 'italic' }}>
        {message}
      </div>
      <SkeletonLines lines={4} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PullToRefresh — mobile-only pull-down gesture wrapper
// ════════════════════════════════════════════════════════════════════
//
// Replaces the screen's scrollable container. On touch devices it tracks
// pull-down from scrollTop===0 and triggers `onRefresh()` past 60px.
// On desktop it's a transparent pass-through (just adds the style).
//
// Usage:
//   <PullToRefresh onRefresh={async () => { /* do stuff */ }}
//                  style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
//     ...content...
//   </PullToRefresh>
//
// `onRefresh` may be sync or return a Promise. The spinner stays up until
// it resolves + a small 300ms hold so it doesn't feel jumpy.

const _PTR_THRESHOLD = 60;
const _PTR_MAX = 110;

function _isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return false;
}

function PullToRefresh({ onRefresh, children, style, message }) {
  // Capture once on mount. Stable across renders.
  const [isTouch] = React.useState(() => _isTouchDevice());

  // Desktop: no PTR — keep the scroll container behavior.
  if (!isTouch) {
    return <div style={style}>{children}</div>;
  }

  return <_PullToRefreshTouch onRefresh={onRefresh} style={style} message={message}>
    {children}
  </_PullToRefreshTouch>;
}

function _PullToRefreshTouch({ onRefresh, children, style, message }) {
  const { state } = useStore();
  const scrollRef = React.useRef(null);
  const startY = React.useRef(0);
  const tracking = React.useRef(false);
  const [pullY, setPullY] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  const onTouchStart = (e) => {
    const el = scrollRef.current;
    if (!el || refreshing) return;
    if (el.scrollTop > 0) return;       // not at top — let normal scroll happen
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  };

  const onTouchMove = (e) => {
    if (!tracking.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      // Going back up or sideways — release
      tracking.current = false;
      setPullY(0);
      return;
    }
    // Damped pull (rubber-band feel)
    const damped = Math.min(_PTR_MAX, Math.pow(dy, 0.82));
    setPullY(damped);
  };

  const onTouchEnd = async () => {
    if (!tracking.current) return;
    tracking.current = false;
    if (pullY < _PTR_THRESHOLD) {
      setPullY(0);
      return;
    }
    setRefreshing(true);
    setPullY(50);                        // settle to "loading" position
    try {
      await Promise.resolve(onRefresh && onRefresh());
    } catch (_) {
      // Swallow — refresh failures shouldn't crash the screen
    }
    // Hold briefly so it doesn't feel like a flicker
    setTimeout(() => {
      setPullY(0);
      setRefreshing(false);
    }, 320);
  };

  // Persona-aware microcopy on the spinner
  const persona = state.settings.persona || 'neutral';
  const phrases = {
    polish_mom:    'רגע, מותק...',
    salesman:      'מסנכרן את הPortfolio...',
    cynic_coach:   'מרענן.',
    jealous_friend:'אוקיי, אוקיי, מרענן...',
    neutral:       'מרענן...',
  };
  const idleHint = pullY > _PTR_THRESHOLD ? 'שחרר לרענון' : 'משוך לרענון';
  const activeHint = message || phrases[persona] || phrases.neutral;

  // Indicator opacity ramps up with pull
  const opacity = Math.min(1, pullY / _PTR_THRESHOLD);

  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ ...style, position: 'relative', overscrollBehaviorY: 'contain' }}
    >
      {/* Floating indicator — sits above content, fades in with pull */}
      <div style={{
        position: 'sticky', top: 0, height: 0, zIndex: 5,
        pointerEvents: 'none', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginTop: Math.max(0, pullY - 28),
          padding: '6px 14px',
          background: T.bgElev2, border: `1px solid ${T.stroke}`,
          borderRadius: 999,
          opacity,
          transform: `scale(${0.85 + opacity * 0.15})`,
          transition: refreshing || pullY === 0 ? 'all 240ms ease' : 'none',
          color: T.lime, fontSize: 11, fontFamily: T.mono, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          <_PTRSpinner spinning={refreshing} angle={pullY * 3} />
          <span style={{ color: refreshing ? T.lime : T.inkSub }}>
            {refreshing ? activeHint : idleHint}
          </span>
        </div>
      </div>

      {/* Content shifts down with pull for tactile feel */}
      <div style={{
        transform: `translateY(${refreshing ? 30 : pullY * 0.5}px)`,
        transition: refreshing || pullY === 0 ? 'transform 240ms ease' : 'none',
      }}>
        {children}
      </div>
    </div>
  );
}

function _PTRSpinner({ spinning, angle = 0 }) {
  return (
    <>
      <style>{`@keyframes mk-ptr-spin { to { transform: rotate(360deg); } }`}</style>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        style={{
          transform: spinning ? undefined : `rotate(${angle}deg)`,
          animation: spinning ? 'mk-ptr-spin 0.9s linear infinite' : 'none',
          transition: spinning ? 'none' : 'transform 80ms',
        }}>
        <circle cx="12" cy="12" r="9" stroke={T.stroke} strokeWidth="2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke={T.lime} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </>
  );
}
