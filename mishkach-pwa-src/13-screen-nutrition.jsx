// ════════════════════════════════════════════════════════════════════
// 13-screen-nutrition.jsx — Nutrition module (AI-powered)
// ════════════════════════════════════════════════════════════════════

function NutritionScreen({ onNavigate }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const [dateViewing, setDateViewing] = React.useState(todayISO());
  const [addOpen, setAddOpen] = React.useState(false);
  const [goalsOpen, setGoalsOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [editingMeal, setEditingMeal] = React.useState(null); // {meal, date}

  const goals = state.nutrition.goals;
  const mealsForDay = state.nutrition.meals[dateViewing] || [];
  const totals = sumMealsForDay(mealsForDay);
  const nStreak = nutritionStreak(state.nutrition.meals);

  // Auto-calc goals if not set
  React.useEffect(() => {
    if (goals.calories === null && stats.current !== null) {
      const auto = calculateNutritionGoals(state.user, state.goal, stats.current);
      dispatch({ type: 'SET_NUTRITION_GOALS', goals: { ...auto, source: 'auto' } });
    }
  }, [goals.calories, stats.current]);

  if (goals.calories === null) {
    return (
      <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>NUTRITION · תזונה</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>יעדים יומיים</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <EmptyState icon="🎯" title="הגדר יעדים" message="כדי להתחיל מעקב תזונה, צריך לקבוע יעדי קלוריות וחלבון."
            action={<Button onClick={() => setGoalsOpen(true)}>הגדר עכשיו</Button>} />
        </div>
        {goalsOpen && <NutritionGoalsDialog onClose={() => setGoalsOpen(false)} />}
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.font, height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>NUTRITION</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>תזונה · {fmt.relativeDay(dateViewing)}</div>
        </div>
        {nStreak >= 2 && (
          <div style={{
            padding: '4px 10px', background: `${T.amber}20`, border: `1px solid ${T.amber}55`,
            borderRadius: 999, fontSize: 11, color: T.amber, fontFamily: T.mono, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <TabIcon name="flame" size={12} />
            {nStreak} ימים
          </div>
        )}
        <button onClick={() => setSearchOpen(true)} style={{
          background: T.bgElev, border: 'none', color: T.ink, cursor: 'pointer',
          width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }} aria-label="חיפוש בארוחות">
          🔍
        </button>
        <button onClick={() => setGoalsOpen(true)} style={{
          background: T.bgElev, border: 'none', color: T.ink, cursor: 'pointer',
          width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TabIcon name="target" size={18} />
        </button>
      </div>

      {/* Day navigator */}
      <div style={{ padding: '4px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setDateViewing(d => addDaysISO(d, -1))} style={navBtn}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: T.mono, color: T.inkSub }}>{fmt.day(dateViewing)}</div>
        <button onClick={() => setDateViewing(d => addDaysISO(d, 1))} disabled={dateViewing >= todayISO()} style={{ ...navBtn, opacity: dateViewing >= todayISO() ? 0.3 : 1 }}>›</button>
      </div>

      <PullToRefresh
        onRefresh={() => new Promise(r => setTimeout(r, 600))}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}
      >
        {/* Rings hero */}
        <NutritionRings totals={totals} goals={goals} />

        {/* Mini stats — redesigned for readability */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          <MacroCard label="חלבון" val={totals.protein} goal={goals.protein} color={T.lime} />
          <MacroCard label="פחמימות" val={totals.carbs} goal={goals.carbs} color={T.amber} />
          <MacroCard label="שומן" val={totals.fat} goal={goals.fat} color={T.rose} />
        </div>

        {/* Meals list header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
            ארוחות · {mealsForDay.length}
          </div>
          {mealsForDay.length > 0 && (
            <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono }}>הקש לעריכה · החלק למחיקה</div>
          )}
        </div>

        {mealsForDay.length === 0 ? (
          <Card padding={24} style={{ textAlign: 'center', border: `1px dashed ${T.stroke}`, background: 'transparent' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
            <div style={{ fontSize: 13, color: T.inkSub }}>
              {dateViewing === todayISO()
                ? personaStr(state, 'empty_meals', 'עדיין לא נרשמה ארוחה היום')
                : 'עדיין לא נרשמה ארוחה לתאריך הזה'}
            </div>
          </Card>
        ) : (
          <Card padding={0}>
            {mealsForDay.map((m, i) => (
              <MealRow key={m.id} meal={m} dateViewing={dateViewing}
                isLast={i === mealsForDay.length - 1}
                onClick={() => setEditingMeal({ meal: m, date: dateViewing })}
                onDelete={() => {
                  const dateOfMeal = dateViewing;
                  const mealCopy = { ...m };
                  dispatch({ type: 'DELETE_MEAL', date: dateOfMeal, mealId: m.id });
                  toast(personaStr(state, 'meal_deleted', 'ארוחה נמחקה'), {
                    type: 'info',
                    duration: 5000,
                    actionLabel: 'בטל',
                    onAction: () => {
                      dispatch({ type: 'ADD_MEAL', date: dateOfMeal, meal: mealCopy });
                    },
                  });
                }}
              />
            ))}
          </Card>
        )}

        {/* Add meal CTA — works for any day */}
        <div style={{ marginTop: 14 }}>
          <Button onClick={() => setAddOpen(true)}>
            + הוסף ארוחה {dateViewing !== todayISO() ? `ל-${fmt.dayShort(dateViewing)}` : ''}
          </Button>
        </div>
      </PullToRefresh>

      {addOpen && <AddMealDialog date={dateViewing} onClose={() => setAddOpen(false)} />}
      {goalsOpen && <NutritionGoalsDialog onClose={() => setGoalsOpen(false)} />}
      {editingMeal && <EditMealDialog date={editingMeal.date} meal={editingMeal.meal} onClose={() => setEditingMeal(null)} />}
      {searchOpen && <MealSearchDialog onClose={() => setSearchOpen(false)} onJumpToDate={(d) => { setDateViewing(d); setSearchOpen(false); }} />}
    </div>
  );
}

const navBtn = {
  width: 32, height: 32, borderRadius: 16, background: T.bgElev, color: T.ink,
  border: 'none', cursor: 'pointer', fontSize: 18, fontFamily: T.mono,
};

// ─── Rings ──────────────────────────────────────────────────────────
function NutritionRings({ totals, goals }) {
  const calPct = goals.calories ? Math.min(100, (totals.calories / goals.calories) * 100) : 0;
  const calColor = totals.calories > goals.calories * 1.05 ? T.rose : T.lime;
  const remaining = goals.calories - totals.calories;
  return (
    <Card padding={20} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 20, background: `linear-gradient(145deg, ${T.bgElev} 0%, ${T.bgElev2} 100%)` }}>
      <RingGauge pct={calPct} size={130} stroke={12} color={calColor} track={T.stroke}>
        <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: -1 }}>{totals.calories}</div>
        <div style={{ fontSize: 9, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>/ {goals.calories}</div>
      </RingGauge>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>קלוריות · CALORIES</div>
        <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700, letterSpacing: -1, color: T.ink, marginTop: 4 }}>
          {remaining >= 0 ? remaining : 0}
        </div>
        <div style={{ fontSize: 12, color: T.inkSub, marginTop: 2 }}>
          {remaining > 0 ? `נותרו היום` : remaining < -50 ? `חריגה של ${Math.abs(remaining)}` : `סגרת את היום`}
        </div>
        {totals.count > 0 && (
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginTop: 6 }}>
            {totals.count} ארוחות · ~{Math.round(totals.calories / totals.count)} לארוחה
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Macro card — big, readable ────────────────────────────────────
function MacroCard({ label, val, goal, color }) {
  const pct = goal ? Math.min(100, (val / goal) * 100) : 0;
  const pctRounded = Math.round(pct);
  const pctColor = pct >= 95 ? T.lime : pct >= 70 ? T.amber : T.inkSub;
  return (
    <Card padding={12} style={{ textAlign: 'center', background: T.bgElev }}>
      <div style={{ fontSize: 12, color: T.inkSub, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
        <span style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>{val}</span>
        <span style={{ fontSize: 14, color: T.inkSub, fontFamily: T.mono, fontWeight: 600 }}>ג</span>
      </div>
      <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, marginTop: 4 }}>
        מתוך {goal}ג
      </div>
      <div style={{ height: 6, background: T.stroke, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 300ms' }} />
      </div>
      <div style={{ fontSize: 12, color: pctColor, fontFamily: T.mono, marginTop: 6, fontWeight: 700 }}>
        {pctRounded}%
      </div>
    </Card>
  );
}

// ─── Legacy alias (some code may still reference MiniStat) ──────────
const MiniStat = MacroCard;

// ─── Meal row (swipeable, clickable to edit) ──────────────────────
function MealRow({ meal, dateViewing, isLast, onDelete, onClick }) {
  const [swipeX, setSwipeX] = React.useState(0);
  const [moved, setMoved] = React.useState(false);
  const startX = React.useRef(0);
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setMoved(false); };
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 8) setMoved(true);
    if (dx > 0) setSwipeX(Math.min(80, dx));
    else setSwipeX(0);
  };
  const onTouchEnd = () => setSwipeX(swipeX > 40 ? 80 : 0);

  const handleClick = () => {
    if (moved || swipeX > 0) return; // ignore click after swipe
    onClick?.();
  };

  const sourceIcon = meal.source === 'photo_parse' ? '📷' : meal.source === 'label_parse' ? '🏷️' : meal.source === 'manual' ? '✏️' : meal.source === 'favorite' ? '⭐' : '💬';

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: isLast ? 'none' : `1px solid ${T.stroke}` }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 80,
        background: T.rose, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button onClick={onDelete} style={{
          background: 'transparent', border: 'none', color: T.ink, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          <span style={{ fontSize: 10, fontWeight: 700 }}>מחק</span>
        </button>
      </div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={handleClick} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        background: T.bgElev, transform: `translateX(${swipeX}px)`,
        transition: swipeX === 0 || swipeX === 80 ? 'transform 200ms' : 'none',
        cursor: 'pointer',
      }}>
        {meal.thumbnail ? (
          <img src={meal.thumbnail} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: T.bgElev2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {sourceIcon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.description}</div>
          <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 3 }}>
            {meal.time} · <span style={{ color: T.lime }}>{meal.protein}ג</span> חלבון · <span style={{ color: T.amber }}>{meal.carbs}ג</span> פחמ׳ · <span style={{ color: T.rose }}>{meal.fat}ג</span> שומן
          </div>
        </div>
        <div style={{ textAlign: 'left', fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.ink, minWidth: 40 }}>
          {meal.calories}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Add meal dialog — favorites / text / photo / manual
// ═════════════════════════════════════════════════════════════════════
function AddMealDialog({ date, onClose }) {
  const { state } = useStore();
  const hasFavorites = Object.keys(state.nutrition.favorites || {}).length > 0;
  // Default to favorites if any exist; otherwise show mode selector
  const [mode, setMode] = React.useState(hasFavorites ? 'favorites' : null);
  const [parsedResult, setParsedResult] = React.useState(null);
  const [photoThumb, setPhotoThumb] = React.useState(null);

  const reset = () => { setMode(hasFavorites ? 'favorites' : null); setParsedResult(null); setPhotoThumb(null); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 800,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        {parsedResult ? (
          <button onClick={reset} style={iconBtn}>‹ חזור</button>
        ) : mode && !hasFavorites ? (
          <button onClick={reset} style={iconBtn}>‹</button>
        ) : null}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          {parsedResult ? 'אשר את הערכים' : 'הוספת ארוחה'}
        </div>
        <button onClick={onClose} style={iconBtn}>×</button>
      </div>

      {/* Mode tabs when not in review */}
      {!parsedResult && (
        <div style={{ padding: '10px 18px 4px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {hasFavorites && <ModeTab active={mode === 'favorites'} onClick={() => setMode('favorites')} iconName="star" label="מועדפים" />}
          <ModeTab active={mode === 'text'} onClick={() => setMode('text')} iconName="chat" label="טקסט" />
          <ModeTab active={mode === 'photo'} onClick={() => setMode('photo')} iconName="photo" label="תמונה" />
          <ModeTab active={mode === 'manual'} onClick={() => setMode('manual')} iconName="edit" label="ידני" />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!mode && !parsedResult && <ModeSelector onPick={setMode} />}
        {mode === 'favorites' && !parsedResult && <FavoritesFlow date={date} onClose={onClose} />}
        {mode === 'text' && !parsedResult && <TextParseFlow onParsed={setParsedResult} />}
        {mode === 'photo' && !parsedResult && <PhotoParseFlow onParsed={(r, thumb) => { setParsedResult(r); setPhotoThumb(thumb); }} />}
        {mode === 'manual' && !parsedResult && <ManualFlow onSubmit={setParsedResult} />}
        {parsedResult && <ReviewAndSave
          result={parsedResult}
          thumbnail={photoThumb}
          source={mode === 'photo' ? 'photo_parse' : mode === 'text' ? 'text_parse' : 'manual'}
          date={date}
          onDone={onClose}
        />}
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, icon, iconName, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 999, border: `1px solid ${active ? T.lime : T.stroke}`,
      background: active ? T.lime : 'transparent', color: active ? T.bg : T.inkSub,
      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
      display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {iconName ? <TabIcon name={iconName} size={15} /> : <span>{icon}</span>}{label}
    </button>
  );
}

// ─── Favorites flow — reuse previously saved meals ──────────────────
function FavoritesFlow({ date, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [query, setQuery] = React.useState('');
  const [pending, setPending] = React.useState(null); // { fav, scale }

  const favs = sortedFavorites(state.nutrition.favorites, 50);
  const filtered = query
    ? favs.filter(f => f.description.toLowerCase().includes(query.toLowerCase()))
    : favs;

  const addFav = (fav, scale = 1) => {
    dispatch({
      type: 'ADD_MEAL', date,
      meal: {
        time: nowHHMM(),
        description: fav.description + (scale !== 1 ? ` (×${scale})` : ''),
        calories: Math.round(fav.calories * scale),
        protein: Math.round(fav.protein * scale),
        carbs: Math.round(fav.carbs * scale),
        fat: Math.round(fav.fat * scale),
        source: 'favorite',
        thumbnail: fav.thumbnail || null,
        items: [], confidence: 'high',
      },
    });
    toast(personaStr(state, 'favorite_added', 'נוסף מהמועדפים'), { type: 'success' });
    onClose();
  };

  if (favs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
        <div style={{ fontSize: 14, color: T.inkSub, lineHeight: 1.6 }}>
          עדיין אין מועדפים.<br />
          כל ארוחה שתוסיף תישמר אוטומטית כאן לשימוש חוזר.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 18px 20px' }}>
      {favs.length > 5 && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש בארוחות שלך..."
          style={{
            width: '100%', padding: '10px 14px', background: T.bgElev,
            border: `1px solid ${T.stroke}`, borderRadius: 10,
            color: T.ink, fontSize: 13, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right', marginBottom: 12,
          }}
        />
      )}

      <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 8 }}>
        {filtered.length} ארוחות · לחץ להוספה · לחץ ארוך לשינוי כמות
      </div>

      {filtered.map(f => (
        <FavoriteRow key={f.key} fav={f}
          onClick={() => addFav(f, 1)}
          onLongPress={() => setPending({ fav: f, scale: 1 })}
          onRemove={() => {
            const favCopy = { ...state.nutrition.favorites[f.key] };
            const favKey = f.key;
            dispatch({ type: 'REMOVE_FAVORITE', favKey });
            toast(personaStr(state, 'favorite_removed', 'הוסר מהמועדפים'), {
              type: 'info',
              duration: 5000,
              actionLabel: 'בטל',
              onAction: () => {
                dispatch({ type: 'RESTORE_FAVORITE', favKey, fav: favCopy });
              },
            });
          }}
        />
      ))}

      {pending && <ScaleFavoriteDialog fav={pending.fav}
        onConfirm={(scale) => { addFav(pending.fav, scale); setPending(null); }}
        onCancel={() => setPending(null)}
      />}
    </div>
  );
}

function FavoriteRow({ fav, onClick, onLongPress, onRemove }) {
  const pressTimer = React.useRef(null);
  const longPressed = React.useRef(false);
  const handleDown = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress?.();
    }, 500);
  };
  const handleUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!longPressed.current) onClick?.();
  };
  const handleCancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: T.bgElev, borderRadius: T.radius, marginBottom: 6, cursor: 'pointer',
      border: `1px solid ${T.stroke}`,
    }}
    onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleCancel} onPointerCancel={handleCancel}>
      {fav.thumbnail ? (
        <img src={fav.thumbnail} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: 7, background: T.bgElev2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>⭐</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.description}</div>
        <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, marginTop: 2 }}>
          {fav.calories} ק״ק · נוסף {fav.useCount} פעמים
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove?.(); }} style={{
        background: 'transparent', border: 'none', color: T.inkMute, cursor: 'pointer',
        padding: 4, fontSize: 14,
      }}>🗑</button>
    </div>
  );
}

function ScaleFavoriteDialog({ fav, onConfirm, onCancel }) {
  const [scale, setScale] = React.useState(1);
  const chips = [0.5, 1, 1.5, 2];
  const scaled = (v) => Math.round(v * scale);
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 950,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.bgElev, borderRadius: T.radiusL, border: `1px solid ${T.strokeHi}`,
        padding: 20, maxWidth: 360, width: '100%', direction: 'rtl',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{fav.description}</div>
        <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, marginBottom: 14 }}>כמות · מכפיל</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
          {chips.map(c => (
            <button key={c} onClick={() => setScale(c)} style={{
              padding: '10px 0', borderRadius: 10,
              border: `1px solid ${scale === c ? T.lime : T.stroke}`,
              background: scale === c ? T.lime : 'transparent',
              color: scale === c ? T.bg : T.inkSub,
              fontFamily: T.mono, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>×{c}</button>
          ))}
        </div>

        <div style={{ padding: 12, background: T.bg, borderRadius: 10 }}>
          <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.ink, textAlign: 'center' }}>
            {scaled(fav.calories)} ק״ק
          </div>
          <div style={{ fontSize: 11, color: T.inkSub, fontFamily: T.mono, marginTop: 4, textAlign: 'center' }}>
            <span style={{ color: T.lime }}>{scaled(fav.protein)}ג</span> חלבון · <span style={{ color: T.amber }}>{scaled(fav.carbs)}ג</span> פחמ׳ · <span style={{ color: T.rose }}>{scaled(fav.fat)}ג</span> שומן
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => onConfirm(scale)}>הוסף</Button>
        </div>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
  border: 'none', cursor: 'pointer', fontSize: 18, fontFamily: T.font,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function ModeSelector({ onPick }) {
  const { state } = useStore();
  const hasAI = apiReady(state.apiConfig);
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 12, color: T.inkMute, marginBottom: 16, lineHeight: 1.5 }}>
        בחר איך להוסיף את הארוחה:
      </div>
      {!hasAI && (
        <div style={{ padding: '12px 14px', background: `${T.amber}15`, border: `1px solid ${T.amber}44`, borderRadius: 10, fontSize: 12, color: T.amber, marginBottom: 16 }}>
          ⚠️ תובנות AI לא הוגדרו. טקסט ותמונה דורשים חיבור. הזנה ידנית עובדת בלעדיו.
        </div>
      )}
      <Col gap={10}>
        <ModeButton iconName="chat" title="טקסט חופשי" desc='כתוב בעברית: "אכלתי שניצל 200 גרם עם אורז ירקות"'
          onClick={() => onPick('text')} disabled={!hasAI} />
        <ModeButton iconName="photo" title="תמונה" desc="צלם ארוחה, תווית מוצר, או מוצר ממותג"
          onClick={() => onPick('photo')} disabled={!hasAI} />
        <ModeButton iconName="edit" title="הזנה ידנית" desc="מלא ערכים בעצמך"
          onClick={() => onPick('manual')} />
      </Col>
    </div>
  );
}

function ModeButton({ icon, iconName, title, desc, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 16,
      border: `1px solid ${T.stroke}`, background: T.bgElev, borderRadius: T.radius,
      cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'right', direction: 'rtl',
      fontFamily: T.font, color: T.ink, opacity: disabled ? 0.5 : 1, width: '100%',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: `${T.lime}18`,
        color: T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{iconName ? <TabIcon name={iconName} size={22} /> : <span style={{ fontSize: 22 }}>{icon}</span>}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: T.inkSub, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <span style={{ color: T.inkMute, fontSize: 18 }}>‹</span>
    </button>
  );
}

// ─── Text parse flow ────────────────────────────────────────────────
function TextParseFlow({ onParsed }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null);
    try {
      const result = await parseNutritionFromText(text.trim(), state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({
          type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          feature: 'nutrition_text',
          costUSD: cost,
        });
      });
      onParsed({ ...result, description: text.trim() });
    } catch (e) {
      setError(e.message);
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 8, fontFamily: T.mono, letterSpacing: 1 }}>תיאור הארוחה</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="למשל: שניצל 200 גרם עם אורז ירקות וסלט ישראלי, בסוף מעדן פרו"
        autoFocus rows={4}
        style={{
          width: '100%', padding: '14px 16px', background: T.bgElev, border: `1px solid ${T.stroke}`,
          borderRadius: 12, color: T.ink, fontSize: 15, fontFamily: T.font, outline: 'none',
          direction: 'rtl', textAlign: 'right', resize: 'none',
        }}
      />
      <div style={{ fontSize: 11, color: T.inkMute, marginTop: 8, lineHeight: 1.5 }}>
        מנוע AI מעריך ומציע. תוכל לערוך בשלב הבא.
      </div>
      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: `${T.rose}15`, border: `1px solid ${T.rose}44`, borderRadius: 10, fontSize: 12, color: T.rose }}>{error}</div>}
      <div style={{ marginTop: 20 }}>
        <Button onClick={handleParse} disabled={!text.trim() || loading}>
          {loading ? 'מנתח...' : 'נתח'}
        </Button>
      </div>
    </div>
  );
}

// ─── Photo parse flow ───────────────────────────────────────────────
function PhotoParseFlow({ onParsed }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const result = await parseNutritionFromImage(file, state.apiConfig, (usage) => {
        const cost = estimateCost(usage, state.apiConfig.model);
        dispatch({
          type: 'TRACK_USAGE',
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          feature: 'nutrition_image',
          costUSD: cost,
        });
      });
      const desc = result.productName || result.items?.map(i => `${i.name} ${i.amount}`).join(', ') || 'ארוחה';
      onParsed({ ...result, description: desc }, result.thumbnail);
    } catch (e) {
      setError(e.message);
      toast(personaErrorFromException(state, e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {!preview ? (
        <>
          <div style={{ fontSize: 12, color: T.inkSub, lineHeight: 1.5, marginBottom: 20 }}>
            צלם ארוחה, תווית תזונה (לוח תזונה), או מוצר ממותג (מעדני פרו, יוגורט וכו׳). המערכת תזהה ותציע ערכים.
          </div>
          <label style={{
            display: 'block', padding: '40px 20px', background: T.bgElev, border: `2px dashed ${T.stroke}`,
            borderRadius: T.radiusL, textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>📷</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>בחר או צלם תמונה</div>
            <div style={{ fontSize: 11, color: T.inkSub, marginTop: 4 }}>JPG/PNG, עד ~3MB אחרי דחיסה</div>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])} />
          </label>
        </>
      ) : (
        <>
          <img src={preview} alt="preview" style={{
            width: '100%', maxHeight: 320, objectFit: 'contain',
            borderRadius: T.radius, background: T.bgElev, marginBottom: 16,
          }} />
          {error && <div style={{ marginBottom: 12, padding: '10px 14px', background: `${T.rose}15`, border: `1px solid ${T.rose}44`, borderRadius: 10, fontSize: 12, color: T.rose }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>החלף</Button>
            <Button onClick={handleParse} disabled={loading}>
              {loading ? 'מנתח...' : 'נתח את התמונה'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Manual entry flow ──────────────────────────────────────────────
function ManualFlow({ onSubmit }) {
  const [desc, setDesc] = React.useState('');
  const [cal, setCal] = React.useState(0);
  const [p, setP] = React.useState(0);
  const [c, setC] = React.useState(0);
  const [f, setF] = React.useState(0);

  const valid = desc.trim().length > 0 && cal > 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>תיאור</div>
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="למשל: ארוחת צהריים"
        style={inputStyle} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קלוריות</div>
        <NumberStepper value={cal} onChange={setCal} min={0} max={3000} step={10} unit="kcal" />
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>חלבון</div>
          <NumberStepper value={p} onChange={setP} min={0} max={300} step={1} unit="ג" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>פחמימות</div>
          <NumberStepper value={c} onChange={setC} min={0} max={500} step={1} unit="ג" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>שומן</div>
          <NumberStepper value={f} onChange={setF} min={0} max={200} step={1} unit="ג" />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Button onClick={() => onSubmit({
          description: desc.trim(), calories: cal, protein: p, carbs: c, fat: f,
          items: [], confidence: 'high', notes: '',
        })} disabled={!valid}>המשך לאישור</Button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', background: T.bgElev, border: `1px solid ${T.stroke}`,
  borderRadius: 12, color: T.ink, fontSize: 15, fontFamily: T.font, outline: 'none',
  direction: 'rtl', textAlign: 'right',
};

// ─── Review & save ──────────────────────────────────────────────────
function ReviewAndSave({ result, thumbnail, source, date, onDone }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [desc, setDesc] = React.useState(result.description || '');
  const [cal, setCal] = React.useState(result.calories);
  const [p, setP] = React.useState(result.protein);
  const [c, setC] = React.useState(result.carbs);
  const [f, setF] = React.useState(result.fat);

  const save = () => {
    dispatch({
      type: 'ADD_MEAL',
      date,
      meal: {
        time: nowHHMM(),
        description: desc.trim() || 'ארוחה',
        calories: cal, protein: p, carbs: c, fat: f,
        source,
        thumbnail: thumbnail || null,
        aiNotes: result.notes || '',
        items: result.items || [],
        confidence: result.confidence || 'high',
      },
    });
    toast(personaStr(state, 'meal_added', 'הארוחה נוספה'), { type: 'success' });
    onDone();
  };

  const confidenceColors = { high: T.lime, medium: T.amber, low: T.rose };
  const confidenceLabels = { high: 'ביטחון גבוה', medium: 'ביטחון בינוני', low: 'ביטחון נמוך · כדאי לבדוק' };

  return (
    <div style={{ padding: 24 }}>
      {/* AI confidence indicator */}
      {source !== 'manual' && (
        <div style={{
          padding: '10px 14px', background: `${confidenceColors[result.confidence]}15`,
          border: `1px solid ${confidenceColors[result.confidence]}44`, borderRadius: 10,
          fontSize: 12, color: confidenceColors[result.confidence], marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700 }}>{confidenceLabels[result.confidence]}</div>
          {result.notes && <div style={{ marginTop: 4, opacity: 0.9, lineHeight: 1.5 }}>{result.notes}</div>}
        </div>
      )}

      {/* Item breakdown if present */}
      {result.items && result.items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1, marginBottom: 6 }}>זוהה</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.items.map((it, i) => (
              <div key={i} style={{
                padding: '4px 10px', background: T.bgElev, borderRadius: 999,
                fontSize: 11, color: T.inkSub, fontFamily: T.font,
              }}>{it.name} · {it.amount}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>תיאור</div>
      <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קלוריות</div>
        <NumberStepper value={cal} onChange={setCal} min={0} max={3000} step={10} unit="kcal" />
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>חלבון</div>
          <NumberStepper value={p} onChange={setP} min={0} max={300} step={1} unit="ג" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>פחמימות</div>
          <NumberStepper value={c} onChange={setC} min={0} max={500} step={1} unit="ג" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>שומן</div>
          <NumberStepper value={f} onChange={setF} min={0} max={200} step={1} unit="ג" />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Button onClick={save}>שמור ארוחה</Button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Nutrition goals dialog
// ═════════════════════════════════════════════════════════════════════
function NutritionGoalsDialog({ onClose }) {
  const { state, stats, dispatch } = useStore();
  const toast = useToast();
  const currentGoals = state.nutrition.goals;
  const auto = calculateNutritionGoals(state.user, state.goal, stats.current);

  const [cal, setCal] = React.useState(currentGoals.calories ?? auto.calories);
  const [p, setP] = React.useState(currentGoals.protein ?? auto.protein);
  const [c, setC] = React.useState(currentGoals.carbs ?? auto.carbs);
  const [f, setF] = React.useState(currentGoals.fat ?? auto.fat);

  const useAuto = () => {
    setCal(auto.calories); setP(auto.protein); setC(auto.carbs); setF(auto.fat);
  };

  const save = (source) => {
    dispatch({
      type: 'SET_NUTRITION_GOALS',
      goals: { calories: cal, protein: p, carbs: c, fat: f, source },
    });
    toast('היעדים נשמרו', { type: 'success' });
    onClose();
  };

  const macroKcal = p * 4 + c * 4 + f * 9;
  const macroVsCal = macroKcal - cal;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 800,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={iconBtn}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>יעדי תזונה</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Card padding={14} style={{ marginBottom: 16, background: `${T.lime}10`, border: `1px solid ${T.lime}40` }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>חישוב אוטומטי</div>
          <div style={{ fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.5 }}>
            BMR: {auto.bmr} · TDEE: {auto.tdee} · גירעון לפי קצב {PACE_CONFIG[state.goal.pace].kgPerWeek}ק״ג/שב׳
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, marginTop: 8, lineHeight: 1.5 }}>
            Mifflin-St Jeor × 1.4 (פעילות יומית נמוכה). אם אתה מתאמן 3-5 פעמים בשבוע, הוסף 10-15% לקלוריות.
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={useAuto} style={{
              background: T.lime, color: T.bg, border: 'none', padding: '8px 14px',
              borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer',
            }}>השתמש בחישוב אוטומטי</button>
          </div>
        </Card>

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קלוריות יומי</div>
        <NumberStepper value={cal} onChange={setCal} min={1000} max={5000} step={50} unit="kcal" />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>חלבון</div>
          <NumberStepper value={p} onChange={setP} min={30} max={400} step={5} unit="ג" />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>פחמימות</div>
          <NumberStepper value={c} onChange={setC} min={0} max={600} step={5} unit="ג" />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שומן</div>
          <NumberStepper value={f} onChange={setF} min={20} max={200} step={5} unit="ג" />
        </div>

        <Card padding={12} style={{ marginTop: 16, background: T.bgElev2 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono }}>בדיקת איזון</div>
          <div style={{ fontSize: 12, color: T.inkSub, marginTop: 6, lineHeight: 1.5 }}>
            {p}×4 + {c}×4 + {f}×9 = {macroKcal} kcal<br/>
            יעד: {cal} kcal · הפרש: <span style={{ color: Math.abs(macroVsCal) > 100 ? T.rose : T.lime }}>{macroVsCal > 0 ? '+' : ''}{macroVsCal}</span>
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Button onClick={() => save('manual')}>שמור יעדים</Button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Edit meal dialog — edit existing meal values
// ═════════════════════════════════════════════════════════════════════
function EditMealDialog({ date, meal, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [desc, setDesc] = React.useState(meal.description || '');
  const [cal, setCal] = React.useState(meal.calories || 0);
  const [p, setP] = React.useState(meal.protein || 0);
  const [c, setC] = React.useState(meal.carbs || 0);
  const [f, setF] = React.useState(meal.fat || 0);
  const [time, setTime] = React.useState(meal.time || nowHHMM());

  const save = () => {
    dispatch({
      type: 'UPDATE_MEAL', date, mealId: meal.id,
      updates: { description: desc.trim() || 'ארוחה', calories: cal, protein: p, carbs: c, fat: f, time },
    });
    toast(personaStr(state, 'meal_edited', 'הארוחה עודכנה'), { type: 'success' });
    onClose();
  };

  const remove = () => {
    const mealCopy = { ...meal };
    dispatch({ type: 'DELETE_MEAL', date, mealId: meal.id });
    toast(personaStr(state, 'meal_deleted', 'ארוחה נמחקה'), {
      type: 'info',
      duration: 5000,
      actionLabel: 'בטל',
      onAction: () => {
        dispatch({ type: 'ADD_MEAL', date, meal: mealCopy });
      },
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 820,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={iconBtn}>×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>עריכת ארוחה</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {meal.thumbnail && (
          <img src={meal.thumbnail} alt="" style={{
            width: '100%', maxHeight: 200, objectFit: 'contain',
            borderRadius: T.radius, background: T.bgElev, marginBottom: 16,
          }} />
        )}

        <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>תיאור</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>שעה</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
            ...inputStyle, direction: 'ltr', textAlign: 'left',
          }} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 6, fontFamily: T.mono, letterSpacing: 1 }}>קלוריות</div>
          <NumberStepper value={cal} onChange={setCal} min={0} max={3000} step={10} unit="kcal" />
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>חלבון</div>
            <NumberStepper value={p} onChange={setP} min={0} max={300} step={1} unit="ג" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>פחמימות</div>
            <NumberStepper value={c} onChange={setC} min={0} max={500} step={1} unit="ג" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.inkMute, marginBottom: 4, fontFamily: T.mono }}>שומן</div>
            <NumberStepper value={f} onChange={setF} min={0} max={200} step={1} unit="ג" />
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Button onClick={save}>שמור שינויים</Button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={remove} style={{
            width: '100%', padding: 14, background: 'transparent', border: `1px solid ${T.rose}55`,
            borderRadius: T.radius, color: T.rose, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font,
          }}>מחק ארוחה זו</button>
        </div>
      </div>
    </div>
  );
}

// ─── MealSearchDialog: search across all meals ever recorded ──────
function MealSearchDialog({ onClose, onJumpToDate }) {
  const { state } = useStore();
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Flatten all meals across all dates with their date attached
  const allMeals = React.useMemo(() => {
    const out = [];
    const meals = state.nutrition?.meals || {};
    Object.keys(meals).forEach(date => {
      (meals[date] || []).forEach(m => {
        out.push({ ...m, _date: date });
      });
    });
    // Sort by date desc, then time desc
    out.sort((a, b) => {
      if (a._date !== b._date) return b._date.localeCompare(a._date);
      return (b.time || '').localeCompare(a.time || '');
    });
    return out;
  }, [state.nutrition?.meals]);

  // Filter
  const filtered = query.trim()
    ? allMeals.filter(m => (m.description || '').toLowerCase().includes(query.toLowerCase()))
    : allMeals.slice(0, 50); // limit when no query

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 825,
      display: 'flex', flexDirection: 'column', direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.stroke}` }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: T.bgElev, color: T.ink,
          border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>SEARCH · חיפוש</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>בכל הארוחות</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 8px' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש לפי תיאור, רכיב, או מילה..."
          style={{
            width: '100%', padding: '12px 16px', background: T.bgElev,
            border: `1px solid ${T.stroke}`, borderRadius: 10,
            color: T.ink, fontSize: 14, fontFamily: T.font, outline: 'none',
            direction: 'rtl', textAlign: 'right',
          }}
        />
      </div>

      <div style={{ padding: '4px 18px', fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 1 }}>
        {query.trim() ? `${filtered.length} תוצאות` : `${filtered.length} ארוחות אחרונות`}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: T.inkMute }}>
            {query.trim() ? 'אין ארוחות שמתאימות' : 'עדיין לא נרשמו ארוחות'}
          </div>
        ) : (
          filtered.map(m => (
            <Card key={`${m._date}-${m.id}`} padding={12} style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => onJumpToDate(m._date)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: T.inkMute, fontFamily: T.mono, letterSpacing: 0.5 }}>
                  {fmt.day(m._date)} · {m.time}
                </div>
                <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 0.5 }}>
                  {m.calories} ק״ק
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>
                {m.description || 'ארוחה'}
              </div>
              <div style={{ fontSize: 11, color: T.inkSub, marginTop: 4, fontFamily: T.mono }}>
                ח׳ {m.protein}g · פ׳ {m.carbs}g · ש׳ {m.fat}g
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
