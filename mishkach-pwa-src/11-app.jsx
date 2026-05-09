// ════════════════════════════════════════════════════════════════════
// 11-app.jsx — Root app: provider, router, SW registration
// ════════════════════════════════════════════════════════════════════

function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Router />
      </StoreProvider>
    </ToastProvider>
  );
}

function Router() {
  const { state, dispatch } = useStore();
  const [screenStack, setScreenStack] = React.useState(['home']);
  const current = screenStack[screenStack.length - 1];

  // v3.15: per-screen parameters for navigations that carry state (e.g.
  // WeightDetailScreen filtered to a specific month, or focusing a date
  // picked from a record row). Keyed by screen name; latest navigation
  // wins. Cleared on `setScreen` to avoid stale params bleeding through
  // a tab switch.
  const [screenParams, setScreenParams] = React.useState({});

  // v3.11: track whether splash already played in THIS session — separate
  // from settings.splashSeenToday (which gates day-level frequency). The
  // splash sets `splashDone` after it finishes; without this flag the
  // splash would re-play on every Router re-render.
  const [splashDone, setSplashDone] = React.useState(false);
  // Same for the install prompt — once user dismisses it this session,
  // don't re-show even if state changes.
  const [installDismissedThisSession, setInstallDismissedThisSession] = React.useState(false);

  // Schedule daily weigh-in notifications
  useNotificationScheduler();
  // PWA install state — reads canInstall / isIOS / isInstalled
  const installState = useInstallPrompt();

  // v3.20: warm the externalized data cache as soon as React mounts.
  //  • strings.json — needed for every persona-flavored UI string
  //  • tips-creative.json — needed by the home tip-of-day card
  //  • ai-prompts.json — only fetched when an AI feature is invoked
  //    (each generate*/parse* in 12-claude-api.jsx awaits loadData first).
  // After each load we dispatch MARK_DATA_LOADED so the store re-renders
  // and personaStr/useData consumers refresh from the inline fallback to
  // the persona-flavored variant. Subscribe-once pattern via onDataLoaded.
  React.useEffect(() => {
    if (typeof prefetchData === 'function') prefetchData('strings', 'tips-creative');
    if (typeof onDataLoaded !== 'function') return;
    const off = onDataLoaded(() => dispatch({ type: 'MARK_DATA_LOADED' }));
    return off;
  }, [dispatch]);

  // setScreen + push now accept an optional params object that the target
  // screen receives via props. When clearing the stack, also clear params
  // for screens NOT in the new stack so they don't reappear stale.
  const setScreen = (s, params) => {
    if (params !== undefined) {
      setScreenParams(p => ({ ...p, [s]: params }));
    } else {
      setScreenParams(p => { const { [s]: _, ...rest } = p; return rest; });
    }
    setScreenStack([s]);
  };
  const push = (s, params) => {
    if (params !== undefined) setScreenParams(p => ({ ...p, [s]: params }));
    setScreenStack(arr => [...arr, s]);
  };
  const pop = () => setScreenStack(arr => arr.length > 1 ? arr.slice(0, -1) : arr);

  // Handle onboarding (first run takes priority over splash — splash plays
  // on the SECOND run onward, when the user has a sense of what the app is)
  if (state.settings.firstLaunch) {
    return <OnboardingScreen />;
  }

  // ── Splash gate (v3.23) ──────────────────────────────────────────
  // Show on cold launches AT MOST every 12 hours (was: once per calendar
  // day). Suppresses splash on quick reopens during the same morning
  // session — but plays again later in the day after a meaningful gap.
  const SPLASH_THROTTLE_MS = 12 * 60 * 60 * 1000;
  const splashAge = Date.now() - (state.context?.lastSplashShown || 0);
  if (!splashDone && splashAge > SPLASH_THROTTLE_MS) {
    return <SplashScreen onComplete={() => {
      dispatch({ type: 'MARK_SPLASH_SHOWN' });
      setSplashDone(true);
    }} />;
  }

  // ── Install prompt gate (v3.23) ──────────────────────────────────
  // Show iff:
  //   • onboarding completed (no Install prompt during signup)
  //   • not yet installed (display-mode detection in useInstallPrompt)
  //   • prompt count < 3 (3-strikes rule — never re-show after 3 dismissals)
  //   • permanent dismiss flag not set
  //   • this session hasn't already dismissed
  //   • either Android/Chrome (canInstall) or iOS Safari (manual flow)
  const installCount = state.context?.installPromptCount || 0;
  const installDismissed = state.context?.installPromptDismissed || false;
  const showInstallPrompt = !installState.isInstalled
    && !!state.context?.onboardingComplete
    && !installDismissed
    && installCount < 3
    && !installDismissedThisSession
    && (installState.canInstall || installState.isIOS);

  // v3.15: Home + History pass `push` so they can stack additional screens
  // (like WeightDetailScreen) without losing the home-tab context. Other
  // screens still use setScreen for tab-style navigation.
  const navFromHome = (s, params) => {
    // Push for drill-down screens that should let `pop` return to home;
    // setScreen for tab switches.
    if (s === 'weight-detail') return push(s, params);
    return setScreen(s, params);
  };

  const renderScreen = () => {
    switch (current) {
      case 'log':           return <LogScreen onClose={pop} onSaved={pop} />;
      case 'goal':          return <GoalScreen onClose={pop} />;
      case 'nutrition':     return <NutritionScreen onNavigate={setScreen} />;
      case 'workout':       return <WorkoutScreen />;
      case 'history':       return <HistoryScreen onNavigate={navFromHome} />;
      case 'me':            return <ProfileScreen onNavigate={push} />;
      case 'weight-detail': return <WeightDetailScreen
                                params={screenParams['weight-detail']}
                                onClose={pop}
                                onNavigate={setScreen} />;
      case 'home':
      default:              return <HomeScreen onNavigate={navFromHome} />;
    }
  };

  // Modal-like screens: log + goal + weight-detail. They cover the whole view
  // (no bottom tab bar, no install prompt overlay competing for attention).
  const isModal = current === 'log' || current === 'goal' || current === 'weight-detail';

  return (
    <div style={{
      background: T.bg, height: '100dvh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
      {!isModal && <TabBar active={current === 'me' ? 'me' : current} onChange={(tab) => {
        if (tab === 'log') push('log');
        else setScreen(tab);
      }} />}

      {showInstallPrompt && <InstallPromptScreen
        onInstalled={() => {
          // Native prompt accepted — count this as a successful install
          // (browser will fire 'appinstalled', useInstallPrompt updates,
          //  showInstallPrompt becomes false on next render).
          setInstallDismissedThisSession(true);
          if (typeof trackEvent === 'function') {
            trackEvent('Install Prompt Accepted', {});
          }
        }}
        onShown={() => {
          // Track each unique render so the count survives reload.
          dispatch({ type: 'INCREMENT_INSTALL_PROMPT_COUNT' });
          if (typeof trackEvent === 'function') {
            trackEvent('Install Prompt Shown', { count: installCount + 1 });
          }
        }}
        onDecline={() => {
          // 3-strikes rule: third dismiss flips the permanent flag.
          // Up to that point each dismiss only blocks the current session.
          const nextCount = installCount + 1;
          if (nextCount >= 3) {
            dispatch({ type: 'DISMISS_INSTALL_PROMPT_PERMANENT' });
          }
          setInstallDismissedThisSession(true);
          if (typeof trackEvent === 'function') {
            trackEvent('Install Prompt Dismissed', { count: nextCount });
          }
        }}
      />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SplashScreen v3.23 — short countdown animation (1500ms total)
// ════════════════════════════════════════════════════════════════════
// 8-frame number decay (88.6 → 0.00) over ~880ms, then 300ms fadeout.
// Color shifts from T.lime to T.inkMute as the count approaches zero
// — visual metaphor for "weight coming off."
//
// Gating (Router): replays at most every 12h. The "skip" link appears
// 500ms in so a returning user can dismiss it manually.
//
// Replaced the v3.11 7-stage version per the v3.23 brief: simpler,
// faster, less intrusive. Same logo asset (logo-welcome.png).

const _SPLASH_FRAMES = [88.6, 76.2, 62.1, 41.5, 21.7, 8.3, 2.1, 0.00];
const _SPLASH_FRAME_MS = 110;
const _SPLASH_TOTAL_MS = 1500;
const _SPLASH_FADEOUT_MS = 300;

function SplashScreen({ onComplete }) {
  const reducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const [frameIdx, setFrameIdx] = React.useState(0);
  const [showSkip, setShowSkip] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);

  // Reduced motion: skip the animation entirely, fade-out only.
  React.useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, _SPLASH_FADEOUT_MS);
      }, 600);
      return () => clearTimeout(t);
    }
    // Frame-by-frame decay; pinned to setInterval for predictable cadence.
    const interval = setInterval(() => {
      setFrameIdx(i => {
        const next = i + 1;
        if (next >= _SPLASH_FRAMES.length) clearInterval(interval);
        return next;
      });
    }, _SPLASH_FRAME_MS);
    // Skip link appears at 500ms so impatient users have an out
    const skipTimer = setTimeout(() => setShowSkip(true), 500);
    // Total budget: full anim + 200ms hold on "0.00" + fadeout
    const fadeTimer = setTimeout(() => setFadeOut(true), _SPLASH_TOTAL_MS - _SPLASH_FADEOUT_MS);
    const completeTimer = setTimeout(onComplete, _SPLASH_TOTAL_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(skipTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const skip = React.useCallback(() => {
    setFadeOut(true);
    setTimeout(onComplete, _SPLASH_FADEOUT_MS);
  }, [onComplete]);

  // Color blends from lime → inkMute as the count approaches 0
  const t = Math.min(1, frameIdx / Math.max(1, _SPLASH_FRAMES.length - 1));
  const numberColor = t < 0.5 ? T.lime : T.inkSub;
  const currentValue = _SPLASH_FRAMES[Math.min(frameIdx, _SPLASH_FRAMES.length - 1)];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: `opacity ${_SPLASH_FADEOUT_MS}ms ease`,
      direction: 'rtl', overflow: 'hidden',
      padding: '0 24px',
    }}>
      {/* Logo 140px per spec */}
      <img src="./logo-welcome.png"
        alt="מִשְׁקַלּוּת"
        style={{
          width: 140, height: 140, objectFit: 'contain',
          borderRadius: 22,
          boxShadow: `0 0 60px ${T.lime}33`,
          marginBottom: 22,
        }} />

      {/* Brand title */}
      <div style={{
        fontSize: 32, fontWeight: 800, color: T.ink,
        letterSpacing: -0.5, marginBottom: 28,
        fontFamily: T.font.body || T.font,
      }}>מִשְׁקַלּוּת.</div>

      {/* Animated number — fades from lime to muted as it counts down */}
      {!reducedMotion && (
        <div style={{
          fontFamily: T.font.mono, fontVariantNumeric: 'tabular-nums',
          fontSize: 96, fontWeight: 700, letterSpacing: -3,
          color: numberColor,
          transition: 'color 420ms ease',
          lineHeight: 1,
        }}>
          {currentValue.toFixed(currentValue < 10 ? 2 : 1)}
        </div>
      )}

      {/* Skip — appears after 500ms, bottom-right (dim) */}
      {showSkip && !fadeOut && (
        <button onClick={skip} style={{
          position: 'absolute', bottom: 24, left: 24,
          background: 'transparent', border: 'none', color: T.inkMute,
          fontSize: 11, fontFamily: T.font.body || T.font,
          cursor: 'pointer', padding: 8, opacity: 0.7,
        }}>דלג</button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// InstallPromptScreen v3.23 — gendered + 3-strikes
// ════════════════════════════════════════════════════════════════════
//
// Replaces AggressiveInstallDialog. The copy is the cynic_coach voice
// (dry, observational, treats user like an adult — "remote control"
// metaphor) but we render the same text regardless of which persona
// the user picked: Hebrew gender forms switch by state.user.gender,
// the persona attribution stays internal.
//
// Gating in Router:
//   • onboardingComplete === true (no install nag during signup)
//   • !installState.isInstalled
//   • installPromptCount < 3 (3-strikes rule)
//   • !installPromptDismissed (permanent kill flag set on third strike)
//
// onShown fires once per render so the count survives reloads. The
// "התקנה" CTA is large lime; the decline link is dim and underlined —
// asymmetric on purpose.

function InstallPromptScreen({ onInstalled, onShown, onDecline }) {
  const { state } = useStore();
  const installState = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  // Fire onShown exactly once per mount. Wrapped in a ref guard so a
  // re-render doesn't double-count. dispatch chain: first paint →
  // INCREMENT_INSTALL_PROMPT_COUNT → state changes → component re-renders
  // (but the ref blocks the second onShown call).
  const shownRef = React.useRef(false);
  React.useEffect(() => {
    if (!shownRef.current && !showIOSGuide) {
      shownRef.current = true;
      onShown && onShown();
    }
  }, [onShown, showIOSGuide]);

  if (showIOSGuide) {
    return <IOSInstallStepsScreen onClose={() => {
      // Showing the iOS steps counts as "user has the info" → mark as
      // installed so the prompt doesn't re-open this session.
      setShowIOSGuide(false);
      onInstalled && onInstalled();
    }} gender={state.user?.gender} />;
  }

  const handleInstall = async () => {
    if (installState.isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const accepted = await installState.install();
    if (accepted) onInstalled && onInstalled();
    // If user dismissed the native prompt, leave the dialog up — they
    // can still tap the explicit decline link.
  };

  const isFemale = state.user?.gender === 'female';
  // Hebrew gender forms (the persona cadence stays the same)
  const youMust       = isFemale ? 'את לא חייבת'       : 'אתה לא חייב';
  const youWillNeed   = isFemale ? 'תצטרכי'             : 'תצטרך';
  const youWillWant   = isFemale ? 'שתרצי'              : 'שתרצה';
  const continueLink  = 'להמשיך בדפדפן';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 9000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', direction: 'rtl', overflow: 'auto',
    }}>
      <img src="./logo-welcome.png"
        alt="מִשְׁקַלּוּת"
        style={{
          width: 100, height: 100, objectFit: 'contain',
          borderRadius: 22, marginBottom: 24,
          boxShadow: `0 0 50px ${T.lime}33`,
        }} />

      <div style={{
        fontSize: 22, fontWeight: 800, color: T.ink,
        letterSpacing: -0.3, marginBottom: 22, textAlign: 'center',
      }}>{youMust} להתקין אותי.</div>

      <div style={{
        maxWidth: 380, fontSize: 15, lineHeight: 1.75, color: T.inkSub,
        textAlign: 'right', marginBottom: 28,
      }}>
        <p style={{ margin: '0 0 14px' }}>
          בלי התקנה, {youWillNeed} לפתוח דפדפן בכל פעם {youWillWant} לשקול את עצמ{isFemale ? 'ך' : 'ך'}.
          זה כמו לקום מהספה כדי להחליף ערוץ. אפשר... אבל יש שלט, אז למה?
        </p>
        <p style={{ margin: 0, color: T.ink }}>
          ההתקנה לוקחת 5 שניות. אחרי זה אני במסך הבית, לחיצה אחת.
        </p>
      </div>

      <button onClick={handleInstall} style={{
        width: '100%', maxWidth: 380, height: 56,
        background: T.lime, color: T.bg, border: 'none',
        borderRadius: 14, fontSize: 18, fontWeight: 800,
        fontFamily: T.font.body || T.font, cursor: 'pointer',
        boxShadow: `0 4px 16px ${T.lime}55`,
      }}>התקנה</button>

      <button onClick={onDecline} style={{
        marginTop: 18, background: 'transparent', border: 'none',
        color: T.inkMute, fontSize: 13, fontFamily: T.font.body || T.font,
        textDecoration: 'underline', cursor: 'pointer',
        textAlign: 'center', padding: 8,
      }}>{continueLink}</button>
    </div>
  );
}

// ─── iOS install instructions (gendered) ────────────────────────────
function IOSInstallStepsScreen({ onClose, gender }) {
  const isFemale = gender === 'female';
  const press = isFemale ? 'לחצי' : 'לחץ';
  const scroll = isFemale ? 'גללי' : 'גלל';
  const choose = isFemale ? 'בחרי' : 'בחר';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 9001,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', direction: 'rtl',
    }}>
      <div style={{
        fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 22, textAlign: 'center',
      }}>ב-iPhone זה קצת אחרת</div>

      <ol style={{
        maxWidth: 380, fontSize: 15, lineHeight: 1.9, color: T.inkSub,
        textAlign: 'right', marginBottom: 28, paddingInlineStart: 22,
      }}>
        <li>{press} על כפתור Share למטה (□↑)</li>
        <li>{scroll} ו-{choose} "Add to Home Screen"</li>
        <li>{press} "Add"</li>
      </ol>

      <button onClick={onClose} style={{
        width: '100%', maxWidth: 380, height: 52,
        background: T.lime, color: T.bg, border: 'none',
        borderRadius: 14, fontSize: 16, fontWeight: 800,
        fontFamily: T.font.body || T.font, cursor: 'pointer',
      }}>הבנתי</button>
    </div>
  );
}

// ─── Service worker registration ────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('[Mishkalut] SW registered:', reg.scope);
    }).catch(err => {
      console.warn('[Mishkalut] SW registration failed:', err);
    });
  });
}

// ─── Mount ──────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
