import { useSyncExternalStore } from "react";
import { subDays } from "date-fns";
import type { AppState, Habit, Settings } from "./types";
import { overallStats, toKey, todayDate } from "./logic";
import { ACHIEVEMENTS } from "./achievements";

const KEY = "habitflow:v1";

const defaultSettings: Settings = {
  name: "",
  theme: "system",
  notifications: false,
  dailySummary: true,
  weekStartsMonday: true,
  dayStartHour: 0,
};

const emptyState: AppState = { version: 1, habits: [], completions: {}, achievements: {}, settings: defaultSettings };

function seed(): AppState {
  const today = new Date();
  const start = toKey(subDays(today, 20));
  const mk = (i: number, p: Partial<Habit>): Habit => ({
    id: crypto.randomUUID(), name: "", icon: "Target", color: "coral", description: "", category: "Health",
    frequency: { type: "daily" }, target: 1, unit: "", reminder: { enabled: false, time: "08:00" },
    startDate: start, archived: false, createdAt: new Date().toISOString(), order: i, ...p,
  });
  const habits = [
    mk(0, { name: "Drink water", icon: "Droplets", color: "blue", target: 8, unit: "glasses", category: "Health" }),
    mk(1, { name: "Morning workout", icon: "Dumbbell", color: "coral", category: "Fitness", frequency: { type: "weekdays", days: [1, 3, 5] } }),
    mk(2, { name: "Read 20 pages", icon: "BookOpen", color: "amber", category: "Study" }),
    mk(3, { name: "Meditate", icon: "Brain", color: "teal", category: "Personal", reminder: { enabled: true, time: "07:30" } }),
  ];
  const completions: AppState["completions"] = {};
  habits.forEach((h, hi) => {
    completions[h.id] = {};
    for (let i = 1; i <= 20; i++) {
      if ((i * 7 + hi * 3) % 10 < 7) completions[h.id][toKey(subDays(today, i))] = h.target;
    }
  });
  return { ...emptyState, habits, completions };
}

let state: AppState = emptyState;
let hydrated = false;
const listeners = new Set<() => void>();
let unlockListener: ((ids: string[]) => void) | null = null;

function emit() { listeners.forEach((l) => l()); }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function set(updater: (s: AppState) => AppState) {
  state = updater(state);
  checkAchievements();
  persist();
  emit();
}

function checkAchievements() {
  const st = overallStats(state, todayDate(state.settings.dayStartHour));
  const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(state, st)).map((a) => a.id);
  if (!fresh.length) return;
  const now = new Date().toISOString();
  state = { ...state, achievements: { ...state.achievements, ...Object.fromEntries(fresh.map((id) => [id, now])) } };
  if (hydrated) unlockListener?.(fresh);
}

export function hydrate() {
  if (hydrated) return;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...emptyState, ...JSON.parse(raw) } : seed();
    state.settings = { ...defaultSettings, ...state.settings };
  } catch { state = seed(); }
  checkAchievements();
  hydrated = true;
  persist();
  emit();
}

export const onAchievementUnlock = (fn: (ids: string[]) => void) => { unlockListener = fn; };

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => emptyState);
}
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
export const getState = () => state;

// ---------- Actions (also the surface a future AI agent will call) ----------
export type HabitInput = Omit<Habit, "id" | "createdAt" | "order" | "archived">;

export const actions = {
  createHabit(input: HabitInput): Habit {
    const habit: Habit = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), archived: false, order: state.habits.length };
    set((s) => ({ ...s, habits: [...s.habits, habit] }));
    return habit;
  },
  updateHabit(id: string, patch: Partial<Habit>) {
    set((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  },
  archiveHabit(id: string, archived = true) { actions.updateHabit(id, { archived }); },
  deleteHabit(id: string) {
    set((s) => {
      const completions = { ...s.completions };
      delete completions[id];
      return { ...s, habits: s.habits.filter((h) => h.id !== id), completions };
    });
  },
  setAmount(id: string, dateKey: string, amount: number) {
    set((s) => ({ ...s, completions: { ...s.completions, [id]: { ...s.completions[id], [dateKey]: Math.max(0, amount) } } }));
  },
  /** One-tap: increments toward target; when complete, resets to 0. Returns true if now complete. */
  tap(id: string, dateKey: string): boolean {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return false;
    const cur = state.completions[id]?.[dateKey] ?? 0;
    const next = cur >= h.target ? 0 : cur + 1;
    actions.setAmount(id, dateKey, next);
    return next >= h.target;
  },
  updateSettings(patch: Partial<Settings>) { set((s) => ({ ...s, settings: { ...s.settings, ...patch } })); },
  exportData: () => JSON.stringify(state, null, 2),
  importData(json: string) {
    const parsed = JSON.parse(json) as AppState;
    if (!Array.isArray(parsed.habits)) throw new Error("Invalid file");
    set(() => ({ ...emptyState, ...parsed, settings: { ...defaultSettings, ...parsed.settings } }));
  },
  reset() { set(() => ({ ...emptyState, settings: state.settings })); },
};
