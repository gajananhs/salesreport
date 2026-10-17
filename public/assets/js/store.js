// Tiny persistent store. State lives in memory and is mirrored to
// localStorage so the demo survives reloads and works offline. Every
// storage access is guarded: private windows / blocked storage fall back
// to in-memory only.
import { seed, DATA_VERSION } from './data.js';
import { today } from './util.js';

const KEY = 'sales-reporter:state';
const listeners = new Set();
let state = load();

function load() {
  try {
    const rawState = localStorage.getItem(KEY);
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (parsed && parsed.version === DATA_VERSION) return rollDay(parsed);
    }
  } catch (_) { /* storage unavailable or corrupt — reseed */ }
  const fresh = seed();
  persist(fresh);
  return fresh;
}

/** Day-scoped records (field-day timer, daily work report) reset at midnight. */
function rollDay(s) {
  const t = today();
  if (!s.day || s.day.date !== t) s.day = { date: t, startedAt: null, endedAt: null };
  if (!s.dailyWork || s.dailyWork.date !== t) s.dailyWork = { date: t, workType: '', rows: [], savedAt: null };
  return s;
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (_) { return false; }
}

export const store = {
  get: () => state,
  /** Mutate state through a function, then persist and notify. */
  update(fn) {
    fn(state);
    rollDay(state);
    persist(state);
    listeners.forEach((l) => l(state));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() {
    state = seed();
    persist(state);
    listeners.forEach((l) => l(state));
  },
  me() { return state.team.find((m) => m.id === state.meId); },
  member(id) { return state.team.find((m) => m.id === id); },
  exportJSON() { return JSON.stringify(state, null, 2); },
};
