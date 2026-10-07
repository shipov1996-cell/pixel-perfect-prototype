// Lovable Cloud persistence layer: maps DB rows <-> app model.
// The UI keeps working against the in-memory AppState in ./store.ts;
// every mutation is written here and the DB is the source of truth.
import { supabase } from "@/integrations/supabase/client";
import type { AppState, Category, Habit, HabitColor, Settings } from "./types";

type HabitRow = {
  id: string; name: string; icon: string; category: string; color: string; description: string;
  frequency_type: string; weekdays: number[]; interval_days: number; target: number; unit: string;
  start_date: string; archived: boolean; sort_order: number; created_at: string;
};

function rowToHabit(r: HabitRow, rem?: { enabled: boolean; remind_at: string }): Habit {
  const frequency: Habit["frequency"] =
    r.frequency_type === "weekdays" ? { type: "weekdays", days: r.weekdays }
    : r.frequency_type === "custom" ? { type: "custom", interval: r.interval_days }
    : { type: "daily" };
  return {
    id: r.id, name: r.name, icon: r.icon, category: r.category as Category, color: r.color as HabitColor,
    description: r.description, frequency, target: r.target, unit: r.unit, startDate: r.start_date,
    archived: r.archived, order: r.sort_order, createdAt: r.created_at,
    reminder: { enabled: rem?.enabled ?? false, time: (rem?.remind_at ?? "08:00").slice(0, 5) },
  };
}

function habitToRow(h: Habit) {
  const f = h.frequency;
  return {
    id: h.id, name: h.name, icon: h.icon, category: h.category, color: h.color, description: h.description,
    frequency_type: f.type, weekdays: f.type === "weekdays" ? f.days : [], interval_days: f.type === "custom" ? f.interval : 1,
    target: h.target, unit: h.unit, start_date: h.startDate, archived: h.archived, sort_order: h.order,
  };
}

function check<T>(res: { error: { message: string } | null; data?: T }) {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function loadAll(userId: string): Promise<Omit<AppState, "version">> {
  const [habits, reminders, completions, ua, settings, profile] = await Promise.all([
    supabase.from("habits").select("*").order("sort_order"),
    supabase.from("reminders").select("habit_id, enabled, remind_at"),
    supabase.from("habit_completions").select("habit_id, completed_on, amount"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at"),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  const remMap = new Map(check<{ habit_id: string; enabled: boolean; remind_at: string }[]>(reminders).map((r) => [r.habit_id, r]));
  const comp: AppState["completions"] = {};
  for (const c of check<{ habit_id: string; completed_on: string; amount: number }[]>(completions)) {
    (comp[c.habit_id] ??= {})[c.completed_on] = c.amount;
  }
  const s = check<{ theme: string; notifications: boolean; daily_summary: boolean; week_starts_monday: boolean; day_start_hour: number } | null>(settings);
  const p = check<{ display_name: string } | null>(profile);
  return {
    habits: check<HabitRow[]>(habits).map((r) => rowToHabit(r, remMap.get(r.id))),
    completions: comp,
    achievements: Object.fromEntries(check<{ achievement_id: string; unlocked_at: string }[]>(ua).map((a) => [a.achievement_id, a.unlocked_at])),
    settings: {
      name: p?.display_name ?? "",
      theme: (s?.theme ?? "system") as Settings["theme"],
      notifications: s?.notifications ?? false,
      dailySummary: s?.daily_summary ?? true,
      weekStartsMonday: s?.week_starts_monday ?? true,
      dayStartHour: s?.day_start_hour ?? 0,
    },
  };
}

export const cloud = {
  async upsertHabit(userId: string, h: Habit) {
    check(await supabase.from("habits").upsert({ ...habitToRow(h), user_id: userId }));
    check(await supabase.from("reminders").upsert(
      { habit_id: h.id, user_id: userId, enabled: h.reminder.enabled, remind_at: h.reminder.time },
      { onConflict: "habit_id" },
    ));
  },
  async deleteHabit(id: string) {
    check(await supabase.from("habits").delete().eq("id", id));
  },
  async setCompletion(userId: string, habitId: string, date: string, amount: number) {
    if (amount <= 0) {
      check(await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("completed_on", date));
    } else {
      check(await supabase.from("habit_completions").upsert(
        { habit_id: habitId, user_id: userId, completed_on: date, amount },
        { onConflict: "habit_id,user_id,completed_on" },
      ));
    }
  },
  async unlock(userId: string, ids: string[]) {
    check(await supabase.from("user_achievements").upsert(
      ids.map((achievement_id) => ({ user_id: userId, achievement_id })),
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
    ));
  },
  async saveSettings(userId: string, s: Settings) {
    check(await supabase.from("user_settings").upsert({
      user_id: userId, theme: s.theme, notifications: s.notifications, daily_summary: s.dailySummary,
      week_starts_monday: s.weekStartsMonday, day_start_hour: s.dayStartHour,
    }));
    check(await supabase.from("profiles").upsert({ id: userId, display_name: s.name.slice(0, 60) }));
  },
  async resetAll(userId: string) {
    check(await supabase.from("habits").delete().eq("user_id", userId));
    check(await supabase.from("user_achievements").delete().eq("user_id", userId));
  },
};
