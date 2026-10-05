// Entry point for a future AI assistant. It exposes read-only context and the
// same mutation actions the UI uses, so agent changes flow through one place.
import { actions, getState } from "./store";
import { activeHabits, currentStreak, habitRate, longestStreak, overallStats, todayDate } from "./logic";

export function getAgentContext() {
  const s = getState();
  const today = todayDate(s.settings.dayStartHour);
  return {
    today: today.toISOString(),
    settings: s.settings,
    stats: overallStats(s, today),
    habits: activeHabits(s).map((h) => ({
      ...h,
      currentStreak: currentStreak(s, h, today),
      longestStreak: longestStreak(s, h, today),
      last30: habitRate(s, h, today, 30),
      history: s.completions[h.id] ?? {},
    })),
  };
}

export const agentTools = {
  createHabit: actions.createHabit,
  updateHabit: actions.updateHabit,
  archiveHabit: actions.archiveHabit,
  logCompletion: actions.setAmount,
  updateSettings: actions.updateSettings,
};
