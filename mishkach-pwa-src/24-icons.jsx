// ════════════════════════════════════════════════════════════════════
// 24-icons.jsx — SVG icon system (persona avatars + extras)
// ════════════════════════════════════════════════════════════════════
//
// Two icon registries already exist in the codebase:
//   - <TabIcon name="..." /> in 04-ui.jsx  — 30+ Lucide-style stroke
//     icons used throughout the app (tabs, headers, action buttons).
//     UNCHANGED — it works.
//
// This file adds the smaller specialized set:
//   - <PersonaIcon kind="polish_mom" /> etc — replaces the cartoony
//     emoji avatars (👵 💼 🧊 🥺 📊) on the persona picker + cards.
//     Designed in the same Lucide-style stroke language as TabIcon so
//     the visual feels native, not pasted.
//
// Why a separate file: persona icons are slightly heavier (each has
// 2-4 paths and represents a *concept* not a noun), and they're only
// used in 1-2 places — keeping them out of TabIcon avoids bloating
// every screen that imports it.
//
// Usage:
//   <PersonaIcon kind="polish_mom" size={42} color={T.lime} />
//
// kind is one of the 5 persona ids. Default size 32, default color
// inherits via currentColor so wrapper backgrounds can tint.

function PersonaIcon({ kind, size = 32, color = 'currentColor', strokeWidth = 1.8 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };

  switch (kind) {
    // ── Polish mother: heart inside a hugging crescent ─────────────
    // Reads as "loving worry" — the curve wraps the heart protectively.
    case 'polish_mom':
      return <svg {...p}>
        <path d="M5 11a8 8 0 0 1 14 0" />
        <path d="M12 21l-5-5a3 3 0 0 1 5-3 3 3 0 0 1 5 3z" fill={color} fillOpacity="0.18" />
      </svg>;

    // ── Salesman: briefcase + a small upward chart line ────────────
    // Reads as "business + growth chart".
    case 'salesman':
      return <svg {...p}>
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M7 16l3-3 2 2 5-5" />
      </svg>;

    // ── Cynical coach: clipboard with a flat (boring) line ─────────
    // Reads as "I've seen the chart, it doesn't impress me".
    case 'cynic_coach':
      return <svg {...p}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4h6v3H9z" />
        <line x1="8" y1="14" x2="16" y2="14" />
      </svg>;

    // ── Jealous friend: speech bubble with a sideways glance dot ───
    // Reads as "side-eye comment".
    case 'jealous_friend':
      return <svg {...p}>
        <path d="M21 12a8 8 0 0 1-12.6 6.5L3 20l1.5-5.4A8 8 0 1 1 21 12z" />
        <circle cx="9" cy="12" r="0.9" fill={color} />
        <circle cx="15" cy="12" r="0.9" fill={color} />
        <path d="M9 15c1 1 5 1 6 0" strokeWidth={strokeWidth * 0.8} />
      </svg>;

    // ── Neutral: pure bar chart (data, no opinion) ─────────────────
    case 'neutral':
      return <svg {...p}>
        <line x1="3" y1="20" x2="21" y2="20" />
        <rect x="6" y="13" width="3" height="7" rx="0.5" fill={color} fillOpacity="0.25" />
        <rect x="11" y="9" width="3" height="11" rx="0.5" fill={color} fillOpacity="0.5" />
        <rect x="16" y="5" width="3" height="15" rx="0.5" fill={color} fillOpacity="0.75" />
      </svg>;

    default:
      // Unknown kind → render a small placeholder dot, not nothing,
      // so the layout doesn't collapse silently.
      return <svg {...p}>
        <circle cx="12" cy="12" r="8" />
      </svg>;
  }
}

// ─── Generic <Icon> alias (placeholder for future expansion) ────────
// Right now just a thin wrapper that delegates to TabIcon when the name
// matches one of its slots, or to PersonaIcon when it matches a persona.
// Lets new code use a single <Icon /> import without caring which
// registry the name lives in.
function Icon({ name, size = 24, color = 'currentColor' }) {
  // Persona ids
  const personaKinds = ['polish_mom', 'salesman', 'cynic_coach', 'jealous_friend', 'neutral'];
  if (personaKinds.includes(name)) {
    return <PersonaIcon kind={name} size={size} color={color} />;
  }
  // Fall back to TabIcon. Note: TabIcon doesn't take a color prop — it
  // inherits via currentColor — so we wrap in a span that sets color.
  return (
    <span style={{ color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <TabIcon name={name} size={size} />
    </span>
  );
}
