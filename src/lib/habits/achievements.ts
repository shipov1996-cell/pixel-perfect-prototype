import type { AppState } from "./types";
import { overallStats } from "./logic";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  check: (s: AppState, st: ReturnType<typeof overallStats>) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-habit", title: "Fresh Start", description: "Create your first habit", icon: "Sprout", xp: 20, check: (s) => s.habits.length > 0 },
  { id: "first-done", title: "First Check", description: "Complete a habit for the first time", icon: "CircleCheck", xp: 25, check: (_, st) => st.total >= 1 },
  { id: "perfect-day", title: "Perfect Day", description: "Complete every habit in a day", icon: "Sun", xp: 40, check: (_, st) => st.perfectDays >= 1 },
  { id: "streak-3", title: "Warming Up", description: "Reach a 3 day streak", icon: "Flame", xp: 30, check: (_, st) => st.best >= 3 },
  { id: "streak-7", title: "On Fire", description: "Reach a 7 day streak", icon: "Zap", xp: 75, check: (_, st) => st.best >= 7 },
  { id: "five-habits", title: "Architect", description: "Track 5 habits at once", icon: "LayoutGrid", xp: 40, check: (_, st) => st.habitCount >= 5 },
  { id: "completions-50", title: "Half Century", description: "Log 50 completions", icon: "Medal", xp: 100, check: (_, st) => st.total >= 50 },
  { id: "streak-30", title: "Unstoppable", description: "Reach a 30 day streak", icon: "Trophy", xp: 250, check: (_, st) => st.best >= 30 },
  { id: "completions-100", title: "Centurion", description: "Log 100 completions", icon: "Crown", xp: 300, check: (_, st) => st.total >= 100 },
  { id: "perfect-10", title: "Flow State", description: "Have 10 perfect days", icon: "Sparkles", xp: 200, check: (_, st) => st.perfectDays >= 10 },
];

export const achievementXp = (s: AppState) =>
  ACHIEVEMENTS.filter((a) => s.achievements[a.id]).reduce((n, a) => n + a.xp, 0);
