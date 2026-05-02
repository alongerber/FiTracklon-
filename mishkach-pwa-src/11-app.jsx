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

  const setScreen = (s) => setScreenStack([s]);
  const push = (s) => setScreenStack(arr => [...arr, s]);
  const pop = () => setScreenStack(arr => arr.length > 1 ? arr.slice(0, -1) : arr);

  // Handle onboarding (first run takes priority over splash — splash plays
  // on the SECOND run onward, when the user has a sense of what the app is)
  if (state.settings.firstLaunch) {
    return <OnboardingScreen />;
  }

  // ── Splash gate ─────────────────────────────────────────────────
  // Once per calendar day. settings.splashSeenToday holds today's ISO date
  // when the splash already ran today.
  const today = todayISO();
  const splashAlreadyToday = state.settings.splashSeenToday === today;
  if (!splashDone && !splashAlreadyToday) {
    return <SplashScreen onComplete={() => {
      dispatch({ type: 'SET_SETTING', key: 'splashSeenToday', value: today });
      setSplashDone(true);
    }} />;
  }

  // ── Install prompt gate (overlay, after splash) ─────────────────
  // Show iff: not yet installed AND user hasn't declined ≥3 times AND
  // either we have a deferred prompt (Android/Chrome) or it's an iOS device
  // (where we fall back to manual instructions).
  const installDeclined = state.settings.installDeclined || 0;
  const showInstallPrompt = !installState.isInstalled
    && installDeclined < 3
    && !installDismissedThisSession
    && (installState.canInstall || installState.isIOS);

  const renderScreen = () => {
    switch (current) {
      case 'log':       return <LogScreen onClose={pop} onSaved={pop} />;
      case 'goal':      return <GoalScreen onClose={pop} />;
      case 'nutrition': return <NutritionScreen onNavigate={setScreen} />;
      case 'workout':   return <WorkoutScreen />;
      case 'history':   return <HistoryScreen onNavigate={setScreen} />;
      case 'me':        return <ProfileScreen onNavigate={push} />;
      case 'home':
      default:          return <HomeScreen onNavigate={setScreen} />;
    }
  };

  // Modal-like screens: log + goal. They cover the whole view.
  const isModal = current === 'log' || current === 'goal';

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

      {showInstallPrompt && <AggressiveInstallDialog
        onInstalled={() => setInstallDismissedThisSession(true)}
        onDecline={() => {
          dispatch({ type: 'SET_SETTING', key: 'installDeclined', value: installDeclined + 1 });
          setInstallDismissedThisSession(true);
        }}
      />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SplashScreen — 7-stage animation, plays once per day
// ════════════════════════════════════════════════════════════════════
//
// Stages (cumulative time in ms):
//   0-500    'noise'     dark + flickering green dots
//   500-800  'figure'    logo fades in (no number yet)
//   800-1300 'settle'    logo settles, scale pulse, weight slot ready
//   1300-2800 'numbers'  weight readout: 88.6 → 87.4 → 85.2 → ... → 0.00
//   2800-3300 'tagline'  "להתקרב." appears below
//   3300-3800 'name'     "מִשְׁקַלּוּת" replaces tagline
//   3800-4300 'fadeout'  whole thing fades to bg
//   4300+    onComplete()
//
// Skip: tap or swipe-up jumps straight to fadeout (300ms exit).
// prefers-reduced-motion: collapse to a 1-second fade with name only.
//
// LOGO NOTE (v3.11): currently uses logo-welcome.png from repo root.
// Once a new branded PNG (with the figure + scale showing 0.00) is dropped
// in, this component renders it untouched — no code change needed.

function SplashScreen({ onComplete }) {
  const reducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const [stage, setStage] = React.useState(reducedMotion ? 'name' : 'noise');
  const [weight, setWeight] = React.useState(0);
  const [skipped, setSkipped] = React.useState(false);

  // Schedule the stage transitions
  React.useEffect(() => {
    if (reducedMotion) {
      // Reduced motion: 1s total, just brand name then exit
      const t1 = setTimeout(() => setStage('fadeout'), 700);
      const t2 = setTimeout(onComplete, 1000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    const timers = [
      setTimeout(() => setStage('figure'),  500),
      setTimeout(() => setStage('settle'),  800),
      setTimeout(() => setStage('numbers'), 1300),
      setTimeout(() => setStage('tagline'), 2800),
      setTimeout(() => setStage('name'),    3300),
      setTimeout(() => setStage('fadeout'), 3800),
      setTimeout(onComplete,                4300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // Weight readout countdown — runs through `numbers` stage
  React.useEffect(() => {
    if (stage !== 'numbers') return;
    const sequence = [88.6, 87.4, 85.2, 82.1, 78.5, 74.2, 65.0, 50.1, 32.8, 12.1, 0.0];
    let i = 0;
    const interval = setInterval(() => {
      setWeight(sequence[i]);
      i++;
      if (i >= sequence.length) clearInterval(interval);
    }, 1500 / sequence.length); // span 1500ms across all values
    return () => clearInterval(interval);
  }, [stage]);

  // Skip → fadeout immediately
  const skip = () => {
    if (skipped) return;
    setSkipped(true);
    setStage('fadeout');
    setTimeout(onComplete, 300);
  };

  // Touch/swipe-up handler — track Y movement, skip on swipe up
  const touchStart = React.useRef(0);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    const dy = touchStart.current - e.touches[0].clientY;
    if (dy > 30) skip();
  };

  return (
    <>
      <style>{`
        @keyframes mk-splash-pixel {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.6; }
        }
        @keyframes mk-splash-pop {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mk-splash-settle {
          0% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes mk-splash-text-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        onClick={skip}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          position: 'fixed', inset: 0, background: T.bg, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: stage === 'fadeout' ? 0 : 1,
          transition: 'opacity 480ms ease',
          cursor: 'pointer', overflow: 'hidden',
        }}>

        {/* Stage 1: random green pixels (CSS-only) */}
        {stage === 'noise' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${(i * 137 % 100)}%`,
                top: `${(i * 89 % 100)}%`,
                width: 4, height: 4,
                background: T.lime,
                borderRadius: 2,
                opacity: 0,
                animation: `mk-splash-pixel ${300 + (i * 17 % 200)}ms ease-in-out infinite`,
                animationDelay: `${i * 13}ms`,
              }} />
            ))}
          </div>
        )}

        {/* Logo block — visible from stage 'figure' onward */}
        {stage !== 'noise' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          }}>
            <div style={{
              width: 170, height: 170,
              animation: stage === 'figure' ? 'mk-splash-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                       : stage === 'settle' ? 'mk-splash-settle 480ms ease-out forwards'
                       : 'none',
              opacity: 1,
            }}>
              <img src="./logo-welcome.png"
                alt="מִשְׁקַלּוּת"
                style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  borderRadius: 24,
                  boxShadow: `0 0 60px ${T.lime}40`,
                }} />
            </div>

            {/* Weight readout — visible during 'numbers' stage and after */}
            {(stage === 'numbers' || stage === 'tagline' || stage === 'name' || stage === 'fadeout') && (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
                fontFamily: T.font.mono,
                color: stage === 'numbers' ? T.lime : T.inkSub,
                transition: 'color 320ms',
              }}>
                <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                  {weight.toFixed(1)}
                </span>
                <span style={{ fontSize: 14, opacity: 0.7 }}>ק״ג</span>
              </div>
            )}

            {/* Tagline — appears in 'tagline' stage */}
            {stage === 'tagline' && (
              <div style={{
                fontFamily: T.font.body, fontSize: 24, fontWeight: 600, color: T.lime,
                animation: 'mk-splash-text-in 320ms ease-out',
              }}>להתקרב.</div>
            )}

            {/* Brand name — replaces tagline in 'name' stage */}
            {(stage === 'name' || stage === 'fadeout') && (
              <div style={{
                fontFamily: T.font.body, fontSize: 32, fontWeight: 800, color: T.ink,
                animation: 'mk-splash-text-in 320ms ease-out',
                letterSpacing: -0.5,
              }}>מִשְׁקַלּוּת</div>
            )}
          </div>
        )}

        {/* Skip hint at bottom — subtle */}
        {!reducedMotion && stage !== 'noise' && stage !== 'fadeout' && (
          <div style={{
            position: 'absolute', bottom: 32, left: 0, right: 0,
            textAlign: 'center', fontSize: 11, color: T.inkMute, fontFamily: T.font.mono,
            opacity: 0.6, letterSpacing: 1,
          }}>
            דלג ↑
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// AggressiveInstallDialog — fullscreen install prompt
// ════════════════════════════════════════════════════════════════════
//
// Shows after splash (and after onboarding) on devices that:
//   - aren't installed as PWA
//   - haven't declined ≥3 times (settings.installDeclined)
//   - either have a deferred install prompt (Android/Chrome/Edge) OR
//     are iOS Safari (we'll show manual instructions)
//
// No close (X). The decline path is the small underline link at the
// bottom — psychological friction by design (per the brief copy).

function AggressiveInstallDialog({ onInstalled, onDecline }) {
  const installState = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  // iOS guide subview — reuses the existing IOSInstallDialog from 04-ui.jsx
  if (showIOSGuide) {
    return <IOSInstallDialog onClose={() => {
      setShowIOSGuide(false);
      // Closing the iOS guide counts as "user saw the steps" — let parent
      // think install completed so the prompt doesn't pop again this session
      onInstalled?.();
    }} />;
  }

  const handleInstallClick = async () => {
    if (installState.isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const accepted = await installState.install();
    if (accepted) {
      onInstalled?.();
    }
    // If user dismissed the native prompt, don't auto-decline — they may
    // try again next session. Just leave the dialog up so they can hit
    // the explicit decline link if they really mean it.
  };

  const installButtonLabel = installState.isIOS ? 'ראה איך להתקין' : 'התקן עכשיו';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 9000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', direction: 'rtl', overflow: 'auto',
    }}>
      <img src="./logo-welcome.png"
        alt="מִשְׁקַלּוּת"
        style={{
          width: 120, height: 120, objectFit: 'contain',
          borderRadius: 24, marginBottom: 28,
          boxShadow: `0 0 50px ${T.lime}33`,
        }} />

      <div style={{
        ...T.text.h1, color: T.ink, marginBottom: 28, textAlign: 'center',
      }}>התקן את האפליקציה.</div>

      <div style={{
        maxWidth: 360, fontSize: 16, lineHeight: 1.7, color: T.inkSub,
        fontFamily: T.font.body, textAlign: 'right', marginBottom: 32,
      }}>
        <p style={{ margin: '0 0 16px' }}>
          לא בגלל שהיא יותר מהירה. היא יותר מהירה.
        </p>
        <p style={{ margin: '0 0 16px' }}>
          לא בגלל שהיא עובדת בלי אינטרנט. היא עובדת בלי אינטרנט.
        </p>
        <p style={{ margin: 0, color: T.ink }}>
          בגלל שאם היא לא על המסך הראשי, אתה לא תפתח אותה. וזה לא בגללה. זה בגללך. שנינו יודעים.
        </p>
      </div>

      <button onClick={handleInstallClick} style={{
        width: '100%', maxWidth: 360, height: 56,
        background: T.lime, color: T.bg, border: 'none',
        borderRadius: 14, fontSize: 17, fontWeight: 800,
        fontFamily: T.font.body, cursor: 'pointer',
        boxShadow: `0 8px 28px ${T.lime}44`,
      }}>{installButtonLabel}</button>

      <button onClick={onDecline} style={{
        marginTop: 18, background: 'transparent', border: 'none',
        color: T.inkMute, fontSize: 13, fontFamily: T.font.body,
        textDecoration: 'underline', cursor: 'pointer',
        textAlign: 'center', padding: 8, lineHeight: 1.5,
      }}>אני אבטיח להיכנס דרך הדפדפן · אנחנו יודעים שלא</button>
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
