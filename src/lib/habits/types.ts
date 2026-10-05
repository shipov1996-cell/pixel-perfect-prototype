// Core data model. Kept serializable (plain JSON) so a future AI agent can
// read and write it via the actions in ./store.ts.

export type DateKey = string; // yyyy-MM-dd (local)

export type HabitColor = "coral" | "amber" | "green" | "teal" | "blue" | "pink";
export type Category = "Health" | "Fitness" | "Study" | "Productivity" | "Personal";

export type Frequency =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] } // 0 = Sunday … 6 = Saturday
  | { type: "custom"; interval: number }; // every N days from startDate

export interface Reminder {
  enabled: boolean;
  time: string; // HH:mm
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: HabitColor;
  description: string;
  category: Category;
  frequency: Frequency;
  target: number;
  unit: string;
  reminder: Reminder;
  startDate: DateKey;
  archived: boolean;
  createdAt: string;
  order: number;
}

/** completions[habitId][dateKey] = amount logged that day */
export type Completions = Record<string, Record<DateKey, number>>;

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  name: string;
  theme: ThemePref;
  notifications: boolean;
  dailySummary: boolean;
  weekStartsMonday: boolean;
  dayStartHour: number; // day rolls over at this hour
}

export interface AppState {
  version: 1;
  habits: Habit[];
  completions: Completions;
  achievements: Record<string, string>; // achievementId -> unlocked ISO time
  settings: Settings;
}
