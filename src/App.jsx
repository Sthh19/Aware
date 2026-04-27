import { useState, useEffect } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const pad = n => String(n).padStart(2, "0");

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(year, month) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getStreak(completions) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = new Date(d.getTime() - i * 86400000).toISOString().split("T")[0];
    if (completions?.[key]) streak++;
    else break;
  }
  return streak;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── storage ────────────────────────────────────────────────────────────────
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── main ───────────────────────────────────────────────────────────────────
export default function Aware() {
  const [isPremium, setIsPremium] = useState(() => load("bl_premium", false));
  const [trackers, setTrackers] = useState(() => load("bl_trackers", [
    { id: 1, name: "My Life", habits: [], notes: {} }
  ]));
  const [activeTracker, setActiveTracker] = useState(0);
  const [view, setView] = useState("monthly"); // daily | weekly | monthly | yearly
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const [modal, setModal] = useState(null); // null | "addHabit" | "addTracker" | "premium" | "history" | "note"
  const [newHabit, setNewHabit] = useState({ name: "", type: "positive" });
  const [newTrackerName, setNewTrackerName] = useState("");
  const [noteDate, setNoteDate] = useState(today());
  const [noteText, setNoteText] = useState("");
  const [historyHabit, setHistoryHabit] = useState(null);
  const [tab, setTab] = useState("habits"); // habits | notes

  useEffect(() => { save("bl_trackers", trackers); }, [trackers]);
  useEffect(() => { save("bl_premium", isPremium); }, [isPremium]);

  const tracker = trackers[activeTracker] || trackers[0];

  // ── tracker mutations ───────────────────────────────────────────────────
  function updateTracker(fn) {
    setTrackers(prev => prev.map((t, i) => i === activeTracker ? fn(t) : t));
  }

  function addHabit() {
    if (!newHabit.name.trim()) return;
    updateTracker(t => ({
      ...t,
      habits: [...t.habits, {
        id: Date.now(),
        name: newHabit.name.trim(),
        type: newHabit.type,
        completions: {},
        active: true,
        startedAt: today(),
      }]
    }));
    setNewHabit({ name: "", type: "positive" });
    setModal(null);
  }

  function toggleHabit(habitId, date) {
    updateTracker(t => ({
      ...t,
      habits: t.habits.map(h =>
        h.id === habitId
          ? { ...h, completions: { ...h.completions, [date]: !h.completions[date] } }
          : h
      )
    }));
  }

  function archiveHabit(habitId) {
    updateTracker(t => ({
      ...t,
      habits: t.habits.map(h => h.id === habitId ? { ...h, active: !h.active } : h)
    }));
  }

  function saveNote() {
    updateTracker(t => ({
      ...t,
      notes: { ...t.notes, [noteDate]: noteText }
    }));
    setModal(null);
  }

  function addTracker() {
    if (!newTrackerName.trim()) return;
    setTrackers(prev => [...prev, { id: Date.now(), name: newTrackerName.trim(), habits: [], notes: {} }]);
    setActiveTracker(trackers.length);
    setNewTrackerName("");
    setModal(null);
  }

  // ── date ranges ─────────────────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear() + yearOffset;
  const refMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const currentMonth = refMonth.getMonth();
  const currentMonthYear = refMonth.getFullYear();
  const totalDays = daysInMonth(currentMonthYear, currentMonth);
  const monthDates = Array.from({ length: totalDays }, (_, i) =>
    `${currentMonthYear}-${pad(currentMonth + 1)}-${pad(i + 1)}`
  );
  const weekDates = getWeekDates(weekOffset);

  const activeHabits = tracker.habits.filter(h => h.active);
  const archivedHabits = tracker.habits.filter(h => !h.active);

  // ── score (today) ────────────────────────────────────────────────────────
  const todayStr = today();
  const positiveToday = activeHabits.filter(h => h.type === "positive" && h.completions[todayStr]).length;
  const positiveTotal = activeHabits.filter(h => h.type === "positive").length;
  const negativeToday = activeHabits.filter(h => h.type === "negative" && h.completions[todayStr]).length;

  // ─── styles ──────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Karla:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f7f5f0; }
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
    .app { min-height: 100vh; background: #f7f5f0; font-family: 'Karla', sans-serif; color: #1a1a1a; }
    .topbar { background: #fff; border-bottom: 1px solid #e8e4dc; padding: 0 24px; display: flex; align-items: center; gap: 16px; height: 56px; position: sticky; top: 0; z-index: 100; }
    .logo { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.02em; flex-shrink: 0; }    
    .tracker-tabs { display: flex; gap: 2px; overflow-x: auto; flex: 1; }
    .tracker-tab { padding: 6px 14px; font-size: 12px; font-family: 'Karla', sans-serif; border: 1px solid transparent; border-radius: 20px; cursor: pointer; white-space: nowrap; background: transparent; color: #888; transition: all 0.15s; font-weight: 500; }
    .tracker-tab.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
    .tracker-tab:hover:not(.active) { border-color: #ddd; color: #444; }
    .add-tracker-btn { font-size: 18px; color: #bbb; background: none; border: none; cursor: pointer; padding: 4px; line-height: 1; flex-shrink: 0; transition: color 0.15s; }
    .add-tracker-btn:hover { color: #444; }
    .premium-badge { font-size: 10px; background: #f0c040; color: #7a5c00; padding: 3px 8px; border-radius: 10px; font-weight: 600; letter-spacing: 0.05em; cursor: pointer; flex-shrink: 0; }
    .subbar { background: #fff; border-bottom: 1px solid #e8e4dc; padding: 0 24px; display: flex; align-items: center; gap: 12px; height: 44px; }
    .view-btn { font-size: 12px; font-family: 'Karla', sans-serif; padding: 4px 12px; border-radius: 16px; border: 1px solid transparent; background: transparent; color: #999; cursor: pointer; transition: all 0.15s; font-weight: 500; }
    .view-btn.active { background: #f0ebe0; color: #1a1a1a; border-color: #e0d8c8; }
    .nav-btn { background: none; border: none; color: #bbb; cursor: pointer; font-size: 16px; padding: 4px 8px; transition: color 0.15s; }
    .nav-btn:hover { color: #444; }
    .period-label { font-size: 13px; color: #666; font-weight: 500; min-width: 140px; text-align: center; }
    .tab-row { display: flex; gap: 0; border-bottom: 1px solid #e8e4dc; background: #fff; padding: 0 24px; }
    .tab-btn { font-size: 13px; font-family: 'Karla', sans-serif; padding: 10px 16px; border: none; background: transparent; color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; font-weight: 500; }
    .tab-btn.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
    .content { padding: 24px; max-width: 900px; margin: 0 auto; }
    .score-row { display: flex; gap: 12px; margin-bottom: 24px; }
    .score-card { background: #fff; border: 1px solid #e8e4dc; border-radius: 10px; padding: 16px 20px; flex: 1; }
    .score-label { font-size: 10px; color: #aaa; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; }
    .score-val { font-family: 'Playfair Display', serif; font-size: 28px; color: #1a1a1a; line-height: 1; }
    .score-sub { font-size: 11px; color: #bbb; margin-top: 2px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .section-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #aaa; font-weight: 600; }
    .add-btn { font-size: 12px; font-family: 'Karla', sans-serif; padding: 5px 12px; background: #1a1a1a; color: #fff; border: none; border-radius: 16px; cursor: pointer; font-weight: 500; transition: opacity 0.15s; }
    .add-btn:hover { opacity: 0.8; }
    .grid-wrap { overflow-x: auto; background: #fff; border: 1px solid #e8e4dc; border-radius: 10px; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; min-width: 500px; }
    th { font-size: 10px; color: #bbb; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 10px 6px; text-align: center; border-bottom: 1px solid #f0ece4; }
    th.habit-col { text-align: left; padding-left: 16px; min-width: 140px; }
    td { padding: 6px; text-align: center; border-bottom: 1px solid #f7f5f0; }
    td.habit-name-cell { text-align: left; padding-left: 16px; padding-right: 8px; }
    tr:last-child td { border-bottom: none; }
    .habit-name { font-size: 13px; color: #1a1a1a; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .habit-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .habit-dot.positive { background: #3cb06a; }
    .habit-dot.negative { background: #e05050; }
    .habit-streak { font-size: 10px; color: #bbb; }
    .check-btn { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid #e8e4dc; background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.12s; font-size: 11px; }
    .check-btn.done.positive { background: #3cb06a; border-color: #3cb06a; color: #fff; }
    .check-btn.done.negative { background: #e05050; border-color: #e05050; color: #fff; }
    .check-btn:hover:not(.done) { border-color: #ccc; background: #f7f5f0; }
    .today-col { background: #faf9f5; }
    .archive-btn { font-size: 10px; color: #ccc; background: none; border: none; cursor: pointer; padding: 2px 6px; transition: color 0.15s; }
    .archive-btn:hover { color: #e05050; }
    .history-btn { font-size: 10px; color: #bbb; background: none; border: none; cursor: pointer; padding: 2px 6px; transition: color 0.15s; text-decoration: underline; }
    .history-btn:hover { color: #444; }
    .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .note-card { background: #fff; border: 1px solid #e8e4dc; border-radius: 10px; padding: 14px; cursor: pointer; transition: border-color 0.15s; }
    .note-card:hover { border-color: #ccc; }
    .note-date { font-size: 10px; color: #bbb; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
    .note-preview { font-size: 13px; color: #555; line-height: 1.5; }
    .note-empty { font-size: 12px; color: #ccc; font-style: italic; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
    .modal-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 20px; }
    .field-label { font-size: 11px; color: #999; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
    .field-input { width: 100%; border: 1.5px solid #e8e4dc; border-radius: 8px; padding: 10px 12px; font-family: 'Karla', sans-serif; font-size: 14px; color: #1a1a1a; outline: none; margin-bottom: 16px; transition: border-color 0.15s; }
    .field-input:focus { border-color: #1a1a1a; }
    .type-toggle { display: flex; gap: 8px; margin-bottom: 20px; }
    .type-opt { flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid #e8e4dc; text-align: center; cursor: pointer; font-size: 13px; font-family: 'Karla', sans-serif; transition: all 0.15s; background: transparent; color: #888; font-weight: 500; }
    .type-opt.selected.positive { border-color: #3cb06a; background: #f0faf4; color: #3cb06a; }
    .type-opt.selected.negative { border-color: #e05050; background: #fef0f0; color: #e05050; }
    .modal-actions { display: flex; gap: 8px; margin-top: 4px; }
    .primary-btn { flex: 1; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; padding: 11px; font-family: 'Karla', sans-serif; font-size: 14px; cursor: pointer; font-weight: 600; transition: opacity 0.15s; }
    .primary-btn:hover { opacity: 0.85; }
    .cancel-btn { padding: 11px 16px; background: transparent; color: #aaa; border: 1.5px solid #e8e4dc; border-radius: 8px; font-family: 'Karla', sans-serif; font-size: 14px; cursor: pointer; transition: all 0.15s; }
    .cancel-btn:hover { border-color: #ccc; color: #666; }
    .premium-modal { text-align: center; }
    .premium-icon { font-size: 40px; margin-bottom: 12px; }
    .premium-feature { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0ece4; text-align: left; }
    .premium-feature:last-of-type { border-bottom: none; }
    .pf-icon { font-size: 18px; }
    .pf-text { font-size: 13px; color: #555; }
    .pf-label { font-weight: 600; color: #1a1a1a; font-size: 13px; display: block; }
    .locked-row { opacity: 0.4; pointer-events: none; }
    .lock-icon { font-size: 10px; margin-left: 4px; }
    .textarea { width: 100%; border: 1.5px solid #e8e4dc; border-radius: 8px; padding: 10px 12px; font-family: 'Karla', sans-serif; font-size: 14px; color: #1a1a1a; outline: none; resize: vertical; min-height: 120px; margin-bottom: 16px; transition: border-color 0.15s; }
    .textarea:focus { border-color: #1a1a1a; }
    .archived-section { margin-top: 24px; }
    .archived-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border: 1px solid #e8e4dc; border-radius: 8px; margin-bottom: 6px; }
    .history-modal { max-width: 480px; }
    .history-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0ece4; font-size: 13px; }
    .history-row:last-child { border-bottom: none; }
    .year-months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .year-month-card { background: #fff; border: 1px solid #e8e4dc; border-radius: 8px; padding: 12px; }
    .ym-label { font-size: 11px; font-weight: 600; color: #aaa; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
    .ym-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .ym-bar-bg { flex: 1; height: 6px; background: #f0ece4; border-radius: 3px; overflow: hidden; }
    .ym-bar-fill { height: 100%; border-radius: 3px; }
    .ym-pct { font-size: 10px; color: #bbb; width: 28px; text-align: right; }
    .empty-state { text-align: center; padding: 48px 20px; color: #ccc; font-size: 13px; }
  `;

  // ── render helpers ────────────────────────────────────────────────────────
  function renderMonthGrid(habits) {
    const todayStr = today();
    return (
      <div className="grid-wrap">
        <table>
          <thead>
            <tr>
              <th className="habit-col">Habit</th>
              {monthDates.map(d => {
                const day = parseInt(d.split("-")[2]);
                const isToday = d === todayStr;
                return <th key={d} style={isToday ? { color: "#1a1a1a" } : {}}>{day}</th>;
              })}
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {habits.map(h => (
              <tr key={h.id}>
                <td className="habit-name-cell">
                  <div className="habit-name">
                    <span className={`habit-dot ${h.type}`} />
                    {h.name}
                  </div>
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    <button className="archive-btn" onClick={() => archiveHabit(h.id)}>pause</button>
                    <button className="history-btn" onClick={() => { setHistoryHabit(h); setModal("history"); }}>history</button>
                  </div>
                </td>
                {monthDates.map(d => {
                  const done = !!h.completions[d];
                  const isToday = d === todayStr;
                  return (
                    <td key={d} className={isToday ? "today-col" : ""}>
                      <button
                        className={`check-btn${done ? ` done ${h.type}` : ""}`}
                        onClick={() => toggleHabit(h.id, d)}
                      >
                        {done ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
                <td style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#1a1a1a" }}>
                  {getStreak(h.completions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderWeekGrid(habits) {
    const todayStr = today();
    return (
      <div className="grid-wrap">
        <table>
          <thead>
            <tr>
              <th className="habit-col">Habit</th>
              {weekDates.map((d, i) => {
                const isToday = d === todayStr;
                const dayNum = parseInt(d.split("-")[2]);
                return (
                  <th key={d} style={isToday ? { color: "#1a1a1a" } : {}}>
                    {WEEKDAYS[i]}<br />
                    <span style={{ fontWeight: 400, fontSize: 9 }}>{dayNum}</span>
                  </th>
                );
              })}
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {habits.map(h => (
              <tr key={h.id}>
                <td className="habit-name-cell">
                  <div className="habit-name">
                    <span className={`habit-dot ${h.type}`} />
                    {h.name}
                  </div>
                </td>
                {weekDates.map(d => {
                  const done = !!h.completions[d];
                  const isToday = d === todayStr;
                  return (
                    <td key={d} className={isToday ? "today-col" : ""}>
                      <button
                        className={`check-btn${done ? ` done ${h.type}` : ""}`}
                        onClick={() => toggleHabit(h.id, d)}
                      >
                        {done ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
                <td style={{ fontFamily: "'Playfair Display', serif", fontSize: 16 }}>
                  {getStreak(h.completions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderYearView(habits) {
    if (!isPremium) {
      return (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, color: "#888", marginBottom: 16 }}>Yearly view is a Premium feature</div>
          <button className="primary-btn" style={{ width: "auto", padding: "10px 24px" }} onClick={() => setModal("premium")}>Unlock Premium</button>
        </div>
      );
    }
    return (
      <div className="year-months">
        {Array.from({ length: 12 }, (_, m) => {
          const daysCount = daysInMonth(currentYear, m);
          return (
            <div className="year-month-card" key={m}>
              <div className="ym-label">{MONTHS_SHORT[m]}</div>
              {habits.slice(0, 4).map(h => {
                const total = daysCount;
                const done = Array.from({ length: total }, (_, d) => {
                  const key = `${currentYear}-${pad(m + 1)}-${pad(d + 1)}`;
                  return h.completions[key] ? 1 : 0;
                }).reduce((a, b) => a + b, 0);
                const pct = Math.round((done / total) * 100);
                return (
                  <div className="ym-bar-row" key={h.id}>
                    <span style={{ fontSize: 9, color: "#bbb", width: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                    <div className="ym-bar-bg">
                      <div className="ym-bar-fill" style={{ width: `${pct}%`, background: h.type === "positive" ? "#3cb06a" : "#e05050" }} />
                    </div>
                    <span className="ym-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  function renderHabitsTab() {
    const positive = activeHabits.filter(h => h.type === "positive");
    const negative = activeHabits.filter(h => h.type === "negative");

    const grid = view === "monthly" ? renderMonthGrid
               : view === "weekly" ? renderWeekGrid
               : view === "yearly" ? () => renderYearView(activeHabits)
               : renderWeekGrid; // daily uses week but offset=0

    return (
      <>
        {/* Score row */}
        <div className="score-row">
          <div className="score-card">
            <div className="score-label">Today's Score</div>
            <div className="score-val">{positiveTotal ? Math.round((positiveToday / positiveTotal) * 100) : 0}<span style={{ fontSize: 14, color: "#bbb" }}>%</span></div>
            <div className="score-sub">{positiveToday} of {positiveTotal} done</div>
          </div>
          <div className="score-card">
            <div className="score-label">Avoided Today</div>
            <div className="score-val" style={{ color: negativeToday > 0 ? "#e05050" : "#3cb06a" }}>
              {negativeToday > 0 ? negativeToday : "✓"}
            </div>
            <div className="score-sub">{negativeToday > 0 ? `${negativeToday} slipped` : "Clean day"}</div>
          </div>
          <div className="score-card">
            <div className="score-label">Best Streak</div>
            <div className="score-val">{Math.max(0, ...tracker.habits.map(h => getStreak(h.completions)))}<span style={{ fontSize: 14, color: "#bbb" }}>d</span></div>
            <div className="score-sub">across all habits</div>
          </div>
        </div>

        {/* Positive habits */}
        {positive.length > 0 && (
          <>
            <div className="section-header">
              <span className="section-title" style={{ color: "#3cb06a" }}>✦ Positive Habits</span>
              <button className="add-btn" onClick={() => { setNewHabit({ name: "", type: "positive" }); setModal("addHabit"); }}>+ Add</button>
            </div>
            {view === "yearly" ? renderYearView(positive) : view === "weekly" || view === "daily" ? renderWeekGrid(positive) : renderMonthGrid(positive)}
          </>
        )}

        {/* Negative habits */}
        {negative.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 24 }}>
              <span className="section-title" style={{ color: "#e05050" }}>✗ Avoid</span>
              <button className="add-btn" style={{ background: "#e05050" }} onClick={() => { setNewHabit({ name: "", type: "negative" }); setModal("addHabit"); }}>+ Add</button>
            </div>
            {view === "yearly" ? renderYearView(negative) : view === "weekly" || view === "daily" ? renderWeekGrid(negative) : renderMonthGrid(negative)}
          </>
        )}

        {/* Empty state */}
        {activeHabits.length === 0 && (
          <div className="empty-state">
            No habits yet.<br />
            <button className="add-btn" style={{ marginTop: 12 }} onClick={() => setModal("addHabit")}>Add your first habit</button>
          </div>
        )}

        {/* Add buttons if habits exist */}
        {activeHabits.length > 0 && positive.length === 0 && (
          <button className="add-btn" onClick={() => { setNewHabit({ name: "", type: "positive" }); setModal("addHabit"); }}>+ Positive Habit</button>
        )}
        {activeHabits.length > 0 && negative.length === 0 && (
          <button className="add-btn" style={{ background: "#e05050", marginLeft: 8 }} onClick={() => { setNewHabit({ name: "", type: "negative" }); setModal("addHabit"); }}>+ Avoid</button>
        )}

        {/* Archived */}
        {archivedHabits.length > 0 && (
          <div className="archived-section">
            <div className="section-title" style={{ marginBottom: 10 }}>Paused / Archived</div>
            {archivedHabits.map(h => (
              <div className="archived-item" key={h.id}>
                <span className={`habit-dot ${h.type}`} />
                <span style={{ fontSize: 13, color: "#aaa", flex: 1 }}>{h.name}</span>
                <button className="add-btn" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => archiveHabit(h.id)}>Resume</button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderNotesTab() {
    const dates = view === "monthly" ? monthDates : view === "weekly" || view === "daily" ? weekDates : monthDates;
    const datesWithNotes = dates.filter(d => tracker.notes[d]);
    return (
      <>
        <div className="section-header">
          <span className="section-title">Journal</span>
          <button className="add-btn" onClick={() => { setNoteDate(today()); setNoteText(tracker.notes[today()] || ""); setModal("note"); }}>+ Note</button>
        </div>
        {datesWithNotes.length === 0 && (
          <div className="empty-state">No notes for this period yet.</div>
        )}
        <div className="notes-grid">
          {datesWithNotes.map(d => (
            <div className="note-card" key={d} onClick={() => { setNoteDate(d); setNoteText(tracker.notes[d] || ""); setModal("note"); }}>
              <div className="note-date">{new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              <div className="note-preview">{tracker.notes[d].slice(0, 80)}{tracker.notes[d].length > 80 ? "…" : ""}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── period label ─────────────────────────────────────────────────────────
  let periodLabel = "";
  let showNav = true;
  if (view === "monthly") periodLabel = formatMonthYear(currentMonthYear, currentMonth);
  else if (view === "weekly" || view === "daily") {
    const s = weekDates[0], e = weekDates[6];
    periodLabel = `${new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(e + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } else if (view === "yearly") periodLabel = String(currentYear);

  return (
    <div className="app">
      <style>{css}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="logo">Aware</div>
        <div className="tracker-tabs">
          {trackers.map((t, i) => (
            <button key={t.id} className={`tracker-tab${activeTracker === i ? " active" : ""}`} onClick={() => setActiveTracker(i)}>
              {t.name}
            </button>
          ))}
        </div>
        <button className="add-tracker-btn" title="New Tracker" onClick={() => {
          if (!isPremium && trackers.length >= 1) { setModal("premium"); return; }
          setModal("addTracker");
        }}>+</button>
        <div className="premium-badge" onClick={() => setModal("premium")}>
          {isPremium ? "★ PRO" : "Upgrade"}
        </div>
      </div>

      {/* Sub bar */}
      <div className="subbar">
        {["daily","weekly","monthly","yearly"].map(v => (
          <button
            key={v}
            className={`view-btn${view === v ? " active" : ""}${v === "yearly" && !isPremium ? " locked-row" : ""}`}
            onClick={() => {
              if (v === "yearly" && !isPremium) { setModal("premium"); return; }
              setView(v);
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}{v === "yearly" && !isPremium ? " 🔒" : ""}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="nav-btn" onClick={() => {
          if (view === "monthly") setMonthOffset(o => o - 1);
          else if (view === "weekly" || view === "daily") setWeekOffset(o => o - 1);
          else if (view === "yearly") setYearOffset(o => o - 1);
        }}>‹</button>
        <span className="period-label">{periodLabel}</span>
        <button className="nav-btn" onClick={() => {
          if (view === "monthly") setMonthOffset(o => o + 1);
          else if (view === "weekly" || view === "daily") setWeekOffset(o => o + 1);
          else if (view === "yearly") setYearOffset(o => o + 1);
        }}>›</button>
      </div>

      {/* Tab row */}
      <div className="tab-row">
        <button className={`tab-btn${tab === "habits" ? " active" : ""}`} onClick={() => setTab("habits")}>Habits</button>
        <button className={`tab-btn${tab === "notes" ? " active" : ""}`} onClick={() => setTab("notes")}>Journal</button>
      </div>

      {/* Content */}
      <div className="content">
        {tab === "habits" ? renderHabitsTab() : renderNotesTab()}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>

          {/* Add Habit */}
          {modal === "addHabit" && (
            <div className="modal">
              <div className="modal-title">New Habit</div>
              <div className="field-label">Name</div>
              <input className="field-input" placeholder="e.g. Work out" value={newHabit.name} autoFocus
                onChange={e => setNewHabit(h => ({ ...h, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addHabit()} />
              <div className="field-label">Type</div>
              <div className="type-toggle">
                <button className={`type-opt${newHabit.type === "positive" ? " selected positive" : ""}`}
                  onClick={() => setNewHabit(h => ({ ...h, type: "positive" }))}>✦ Build</button>
                <button className={`type-opt${newHabit.type === "negative" ? " selected negative" : ""}`}
                  onClick={() => setNewHabit(h => ({ ...h, type: "negative" }))}>✗ Avoid</button>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="primary-btn" onClick={addHabit}>Add Habit</button>
              </div>
            </div>
          )}

          {/* Add Tracker */}
          {modal === "addTracker" && (
            <div className="modal">
              <div className="modal-title">New Tracker</div>
              <div className="field-label">Name</div>
              <input className="field-input" placeholder="e.g. Hockey Season" value={newTrackerName} autoFocus
                onChange={e => setNewTrackerName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTracker()} />
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="primary-btn" onClick={addTracker}>Create</button>
              </div>
            </div>
          )}

          {/* Note */}
          {modal === "note" && (
            <div className="modal">
              <div className="modal-title">
                {new Date(noteDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <textarea className="textarea" placeholder="What happened today?" value={noteText}
                onChange={e => setNoteText(e.target.value)} autoFocus />
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="primary-btn" onClick={saveNote}>Save</button>
              </div>
            </div>
          )}

          {/* History */}
          {modal === "history" && historyHabit && (
            <div className="modal history-modal">
              <div className="modal-title">{historyHabit.name}</div>
              <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
                <div><div className="field-label">Streak</div><div style={{ fontFamily: "'Playfair Display'", fontSize: 24 }}>{getStreak(historyHabit.completions)}d</div></div>
                <div><div className="field-label">All Time</div><div style={{ fontFamily: "'Playfair Display'", fontSize: 24 }}>{Object.values(historyHabit.completions).filter(Boolean).length}d</div></div>
                <div><div className="field-label">Started</div><div style={{ fontFamily: "'Playfair Display'", fontSize: 24 }}>{historyHabit.startedAt}</div></div>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {Object.entries(historyHabit.completions).filter(([, v]) => v).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30).map(([d]) => (
                  <div className="history-row" key={d}>
                    <span>{new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                    <span style={{ color: "#3cb06a" }}>✓</span>
                  </div>
                ))}
                {Object.values(historyHabit.completions).filter(Boolean).length === 0 && <div className="empty-state">No completions yet.</div>}
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="primary-btn" onClick={() => setModal(null)}>Done</button>
              </div>
            </div>
          )}

          {/* Premium */}
          {modal === "premium" && (
            <div className="modal premium-modal">
              <div className="premium-icon">★</div>
              <div className="modal-title">Aware Premium</div>
              <div style={{ marginBottom: 20 }}>
                {[
                  { icon: "📁", label: "Multiple Trackers", desc: "Create separate trackers for school, health, sports" },
                  { icon: "📅", label: "Yearly View", desc: "See your full year at a glance" },
                  { icon: "📤", label: "Export History", desc: "Download all your data as CSV" },
                  { icon: "♾️", label: "Unlimited Habits", desc: "No cap on habit count" },
                ].map(f => (
                  <div className="premium-feature" key={f.label}>
                    <span className="pf-icon">{f.icon}</span>
                    <div><span className="pf-label">{f.label}</span><span className="pf-text">{f.desc}</span></div>
                  </div>
                ))}
              </div>
              <button className="primary-btn" style={{ background: "#f0c040", color: "#7a5c00", marginBottom: 8 }}
                onClick={() => { setIsPremium(true); setModal(null); }}>
                Unlock Premium — $4.99/mo
              </button>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 12 }}>(Demo: clicking unlocks for free)</div>
              <button className="cancel-btn" style={{ width: "100%" }} onClick={() => setModal(null)}>Maybe later</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
