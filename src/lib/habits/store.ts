import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { AppState, Habit, Settings } from "./types";
import { overallStats, toKey, todayDate } from "./logic";
import { ACHIEVEMENTS } from "./achievements";
import { cloud, loadAll } from "./cloud";

// In-memory cache of the signed-in user's data. Lovable Cloud is the source of
// truth: hydrate() loads from it, and every action writes through to it.

const defaultSettings: Settings = {
  name: "", theme: "system", notifications: false, dailySummary: true, weekStartsMonday: true, dayStartHour: 0,
};
const emptyState: AppState = { version: 1, habits: [], completions: {}, achievements: {}, settings: defaultSettings };

let state: AppState = emptyState;
let hydrated = false;
let userId: string | null = null;
let loadError: string | null = null;
const listeners = new Set<() => void>();
let unlockListener: ((ids: string[]) => void) | null = null;

function emit() { listeners.forEach((l) => l()); }

/** Run a cloud write; on failure tell the user and resync from the server. */
function sync(label: string, fn: (uid: string) => Promise<void>) {
  if (!userId) { toast.error("You're signed out. Please sign in again."); return; }
  const uid = userId;
  fn(uid).catch((e: unknown) => {
    console.error(label, e);
    toast.error(`Couldn't ${label}. Please check your connection — your data was restored from the cloud.`);
    void reload();
  });
}

function set(updater: (s: AppState) => AppState) {
  state = updater(state);
  checkAchievements();
  emit();
}

function checkAchievements() {
  if (!hydrated) return;
  const st = overallStats(state, todayDate(state.settings.dayStartHour));
  const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(state, st)).map((a) => a.id);
  if (!fresh.length) return;
  const now = new Date().toISOString();
  state = { ...state, achievements: { ...state.achievements, ...Object.fromEntries(fresh.map((id) => [id, now])) } };
  sync("save your achievement", (uid) => cloud.unlock(uid, fresh));
  unlockListener?.(fresh);
}

async function reload() {
  if (!userId) return;
  const data = await loadAll(userId);
  state = { version: 1, ...data };
  emit();
}

export async function hydrate(uid: string) {
  if (hydrated && userId === uid) return;
  userId = uid;
  loadError = null;
  try {
    await reload();
    hydrated = true;
    checkAchievements(); // catch up silently-earned ones (e.g. from another device)
    emit();
  } catch (e) {
    console.error(e);
    loadError = "We couldn't load your habits. Check your connection and try again.";
    emit();
  }
}

export function clearSession() {
  userId = null; hydrated = false; loadError = null; state = emptyState; emit();
}

export const onAchievementUnlock = (fn: (ids: string[]) => void) => { unlockListener = fn; };

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export function useAppState(): AppState { return useSyncExternalStore(subscribe, () => state, () => emptyState); }
export function useHydrated(): boolean { return useSyncExternalStore(subscribe, () => hydrated, () => false); }
export function useLoadError(): string | null { return useSyncExternalStore(subscribe, () => loadError, () => null); }
export const getState = () => state;

// ---------- Actions (also the surface a future AI agent will call) ----------
export type HabitInput = Omit<Habit, "id" | "createdAt" | "order" | "archived">;

export function validateHabit(h: Partial<HabitInput>): string | null {
  const name = (h.name ?? "").trim();
  if (!name) return "Please give your habit a name.";
  if (name.length > 60) return "Habit name must be 60 characters or fewer.";
  if ((h.description ?? "").length > 300) return "Description must be 300 characters or fewer.";
  if ((h.unit ?? "").length > 30) return "Unit must be 30 characters or fewer.";
  if (!Number.isInteger(h.target) || (h.target ?? 0) < 1 || (h.target ?? 0) > 1000) return "Daily target must be a whole number between 1 and 1000.";
  if (h.frequency?.type === "weekdays" && h.frequency.days.length === 0) return "Pick at least one day of the week.";
  if (h.frequency?.type === "custom" && (!Number.isInteger(h.frequency.interval) || h.frequency.interval < 1 || h.frequency.interval > 365)) return "Repeat interval must be between 1 and 365 days.";
  if (h.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(h.startDate)) return "Please choose a valid start date.";
  if (h.reminder?.enabled && !/^\d{2}:\d{2}$/.test(h.reminder.time)) return "Please choose a valid reminder time.";
  return null;
}

let settingsTimer: ReturnType<typeof setTimeout> | undefined;

export const actions = {
  createHabit(input: HabitInput): Habit {
    const habit: Habit = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), archived: false, order: state.habits.length };
    set((s) => ({ ...s, habits: [...s.habits, habit] }));
    sync("save your habit", (uid) => cloud.upsertHabit(uid, habit));
    return habit;
  },
  updateHabit(id: string, patch: Partial<Habit>) {
    set((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
    const h = state.habits.find((x) => x.id === id);
    if (h) sync("update your habit", (uid) => cloud.upsertHabit(uid, h));
  },
  archiveHabit(id: string, archived = true) { actions.updateHabit(id, { archived }); },
  deleteHabit(id: string) {
    set((s) => {
      const completions = { ...s.completions };
      delete completions[id];
      return { ...s, habits: s.habits.filter((h) => h.id !== id), completions };
    });
    sync("delete your habit", () => cloud.deleteHabit(id));
  },
  setAmount(id: string, dateKey: string, amount: number) {
    const h = state.habits.find((x) => x.id === id);
    if (!h) { toast.error("That habit no longer exists."); return; }
    if (dateKey > toKey(todayDate(state.settings.dayStartHour))) { toast.error("You can't log future days."); return; }
    if (dateKey < h.startDate) { toast.error("That day is before this habit started."); return; }
    const value = Math.min(h.target, Math.max(0, Math.round(amount)));
    set((s) => {
      const days = { ...s.completions[id] };
      if (value > 0) days[dateKey] = value; else delete days[dateKey];
      return { ...s, completions: { ...s.completions, [id]: days } };
    });
    sync("save your progress", (uid) => cloud.setCompletion(uid, id, dateKey, value));
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
  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => sync("save your settings", (uid) => cloud.saveSettings(uid, state.settings)), 400);
  },
  exportData: () => JSON.stringify(state, null, 2),
  async importData(json: string) {
    let parsed: AppState;
    try { parsed = JSON.parse(json); } catch { throw new Error("That file isn't valid JSON."); }
    if (!parsed || !Array.isArray(parsed.habits) || typeof parsed.completions !== "object") throw new Error("That file isn't a HabitFlow backup.");
    if (!userId) throw new Error("Please sign in first.");
    for (const h of parsed.habits) {
      const err = validateHabit(h);
      if (err) throw new Error(`“${h.name || "Unnamed"}”: ${err}`);
    }
    const today = toKey(new Date());
    for (const h of parsed.habits) {
      await cloud.upsertHabit(userId, h);
      for (const [d, v] of Object.entries(parsed.completions[h.id] ?? {})) {
        if (d <= today && v > 0) await cloud.setCompletion(userId, h.id, d, Math.min(h.target, v));
      }
    }
    await reload();
    checkAchievements();
  },
  async reset() {
    if (!userId) return;
    await cloud.resetAll(userId);
    state = { ...emptyState, settings: state.settings };
    emit();
  },
};
