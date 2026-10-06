import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import type { AppState, DateKey, Habit } from "./types";

export const toKey = (d: Date): DateKey => format(d, "yyyy-MM-dd");
export const fromKey = (k: DateKey) => parseISO(k);

export function todayDate(dayStartHour = 0) {
  const now = new Date();
  return now.getHours() < dayStartHour ? subDays(now, 1) : now;
}

export function isDue(habit: Habit, date: Date): boolean {
  const start = fromKey(habit.startDate);
  const diff = differenceInCalendarDays(date, start);
  if (diff < 0) return false;
  const f = habit.frequency;
  if (f.type === "daily") return true;
  if (f.type === "weekdays") return f.days.includes(date.getDay());
  return diff % Math.max(1, f.interval) === 0;
}

export const amountOn = (s: AppState, id: string, k: DateKey) => s.completions[id]?.[k] ?? 0;
export const isDone = (s: AppState, h: Habit, k: DateKey) => amountOn(s, h.id, k) >= h.target;

export function currentStreak(s: AppState, h: Habit, today: Date): number {
  let streak = 0;
  let d = today;
  // Today not yet done doesn't break the streak
  if (isDue(h, d) && !isDone(s, h, toKey(d))) d = subDays(d, 1);
  const start = fromKey(h.startDate);
  for (let i = 0; i < 1000 && d >= start; i++, d = subDays(d, 1)) {
    if (!isDue(h, d)) continue;
    if (isDone(s, h, toKey(d))) streak++;
    else break;
  }
  return streak;
}

export function longestStreak(s: AppState, h: Habit, today: Date): number {
  let best = 0;
  let run = 0;
  for (let d = fromKey(h.startDate); d <= today; d = addDays(d, 1)) {
    if (!isDue(h, d)) continue;
    if (isDone(s, h, toKey(d))) best = Math.max(best, ++run);
    else if (toKey(d) !== toKey(today)) run = 0;
  }
  return best;
}

export function habitRate(s: AppState, h: Habit, today: Date, days?: number) {
  let due = 0;
  let done = 0;
  const from = days ? subDays(today, days - 1) : fromKey(h.startDate);
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!isDue(h, d)) continue;
    due++;
    if (isDone(s, h, toKey(d))) done++;
  }
  return { due, done, rate: due ? done / due : 0 };
}

/** Completed days within [startDate, today]; never counts future dates. */
export const totalCompletions = (s: AppState, h: Habit, today: Date = new Date()) => {
  const max = toKey(today);
  return Object.entries(s.completions[h.id] ?? {}).filter(([k, v]) => k <= max && k >= h.startDate && v >= h.target).length;
};

export const activeHabits = (s: AppState) =>
  s.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);

export function dayProgress(s: AppState, date: Date) {
  const k = toKey(date);
  const due = activeHabits(s).filter((h) => isDue(h, date));
  const done = due.filter((h) => isDone(s, h, k)).length;
  return { due: due.length, done, rate: due.length ? done / due.length : 0 };
}

export function weekDays(today: Date, mondayFirst: boolean) {
  const start = startOfWeek(today, { weekStartsOn: mondayFirst ? 1 : 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function overallStats(s: AppState, today: Date) {
  const habits = activeHabits(s);
  const allTotal = s.habits.reduce((n, h) => n + totalCompletions(s, h), 0);
  const best = Math.max(0, ...s.habits.map((h) => longestStreak(s, h, today)));
  const current = Math.max(0, ...habits.map((h) => currentStreak(s, h, today)));
  const rangeRate = (n: number) => {
    let due = 0, done = 0;
    for (let i = 0; i < n; i++) {
      const p = dayProgress(s, subDays(today, i));
      due += p.due; done += p.done;
    }
    return due ? done / due : 0;
  };
  // weekday performance over last 12 weeks
  const byDow = Array.from({ length: 7 }, () => ({ due: 0, done: 0 }));
  for (let i = 0; i < 84; i++) {
    const d = subDays(today, i);
    const p = dayProgress(s, d);
    byDow[d.getDay()]!.due += p.due;
    byDow[d.getDay()]!.done += p.done;
  }
  const dowRates = byDow.map((x, i) => ({ dow: i, rate: x.due ? x.done / x.due : -1 }));
  const valid = dowRates.filter((x) => x.rate >= 0);
  const bestDay = valid.length ? valid.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const worstDay = valid.length ? valid.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  let perfectDays = 0;
  for (let i = 0; i < 365; i++) {
    const p = dayProgress(s, subDays(today, i));
    if (p.due > 0 && p.done === p.due) perfectDays++;
  }
  return {
    total: allTotal,
    best,
    current,
    week: rangeRate(7),
    month: rangeRate(30),
    allTime: rangeRate(90),
    dowRates,
    bestDay,
    worstDay,
    perfectDays,
    habitCount: habits.length,
  };
}

// ---------- Gamification ----------
export const XP_PER_COMPLETION = 10;

export function xpFor(s: AppState, achievementXp: number) {
  const total = s.habits.reduce((n, h) => n + totalCompletions(s, h), 0);
  return total * XP_PER_COMPLETION + achievementXp;
}

export function levelFor(xp: number) {
  // level n requires 50 * n * (n - 1) XP
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  const base = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  return { level, into: xp - base, needed: next - base, progress: (xp - base) / (next - base) };
}

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function frequencyLabel(h: Habit) {
  const f = h.frequency;
  if (f.type === "daily") return "Every day";
  if (f.type === "custom") return f.interval === 1 ? "Every day" : `Every ${f.interval} days`;
  if (f.days.length === 7) return "Every day";
  if ([1, 2, 3, 4, 5].every((d) => f.days.includes(d)) && f.days.length === 5) return "Weekdays";
  return [...f.days].sort().map((d) => DOW[d]).join(", ");
}
