import { useSyncExternalStore } from "react";
import type { AppState, Habit, Settings } from "./types";
import { overallStats, toKey, todayDate } from "./logic";
import { ACHIEVEMENTS } from "./achievements";

const KEY = "habitflow:v2"; // v1 contained sample data; v2 starts empty
import { toast } from "sonner";

const defaultSettings: Settings = {
  name: "",
  theme: "system",
  notifications: false,
  dailySummary: true,
  weekStartsMonday: true,
  dayStartHour: 0,
};

const emptyState: AppState = { version: 1, habits: [], completions: {}, achievements: {}, settings: defaultSettings };


let state: AppState = emptyState;
let hydrated = false;
const listeners = new Set<() => void>();
let unlockListener: ((ids: string[]) => void) | null = null;

function emit() { listeners.forEach((l) => l()); }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast.error("Couldn't save your changes. Your browser storage may be full or disabled."); }
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
    state = raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
    state.settings = { ...defaultSettings, ...state.settings };
    localStorage.removeItem("habitflow:v1");
  } catch {
    state = emptyState;
    toast.error("Your saved data couldn't be read, so HabitFlow started fresh.");
  }
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

export function validateHabit(h: Partial<HabitInput>): string | null {
  const name = (h.name ?? "").trim();
  if (!name) return "Please give your habit a name.";
  if (name.length > 60) return "Habit name must be 60 characters or fewer.";
  if ((h.description ?? "").length > 300) return "Description must be 300 characters or fewer.";
  if (!Number.isInteger(h.target) || (h.target ?? 0) < 1 || (h.target ?? 0) > 1000) return "Daily target must be a whole number between 1 and 1000.";
  if (h.frequency?.type === "weekdays" && h.frequency.days.length === 0) return "Pick at least one day of the week.";
  if (h.frequency?.type === "custom" && (!Number.isInteger(h.frequency.interval) || h.frequency.interval < 1 || h.frequency.interval > 365)) return "Repeat interval must be between 1 and 365 days.";
  if (h.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(h.startDate)) return "Please choose a valid start date.";
  if (h.reminder?.enabled && !/^\d{2}:\d{2}$/.test(h.reminder.time)) return "Please choose a valid reminder time.";
  return null;
}

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
    const h = state.habits.find((x) => x.id === id);
    if (!h) { toast.error("That habit no longer exists."); return; }
    if (dateKey > toKey(todayDate(state.settings.dayStartHour))) { toast.error("You can't log future days."); return; }
    if (dateKey < h.startDate) { toast.error("That day is before this habit started."); return; }
    amount = Math.min(h.target, Math.max(0, Math.round(amount)));
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
    let parsed: AppState;
    try { parsed = JSON.parse(json); } catch { throw new Error("That file isn't valid JSON."); }
    if (!parsed || !Array.isArray(parsed.habits) || typeof parsed.completions !== "object") throw new Error("That file isn't a HabitFlow backup.");
    set(() => ({ ...emptyState, ...parsed, settings: { ...defaultSettings, ...parsed.settings } }));
  },
  reset() { set(() => ({ ...emptyState, settings: state.settings })); },
};
