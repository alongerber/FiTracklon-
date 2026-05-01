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
  const { state } = useStore();
  const [screenStack, setScreenStack] = React.useState(['home']);
  const current = screenStack[screenStack.length - 1];

  // Schedule daily weigh-in notifications
  useNotificationScheduler();

  const setScreen = (s) => setScreenStack([s]);
  const push = (s) => setScreenStack(arr => [...arr, s]);
  const pop = () => setScreenStack(arr => arr.length > 1 ? arr.slice(0, -1) : arr);

  // Handle onboarding
  if (state.settings.firstLaunch) {
    return <OnboardingScreen />;
  }

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
