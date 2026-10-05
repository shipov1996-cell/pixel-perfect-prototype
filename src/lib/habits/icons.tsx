import {
  Activity, Apple, Bed, Bike, BookOpen, Brain, Coffee, Crown, CircleCheck, Droplets, Dumbbell, Flame,
  Footprints, Guitar, Heart, LayoutGrid, Leaf, Medal, Moon, Music, PenLine, Pill, Salad, Smartphone,
  Sparkles, Sprout, Sun, Target, Trophy, Wallet, Zap, Languages, Code, Brush, type LucideIcon,
} from "lucide-react";
import type { HabitColor } from "./types";

export const ICONS: Record<string, LucideIcon> = {
  Droplets, Dumbbell, BookOpen, Brain, Bed, Footprints, Apple, Salad, Bike, Heart, Moon, Sun, Coffee,
  PenLine, Music, Guitar, Leaf, Pill, Smartphone, Wallet, Target, Activity, Languages, Code, Brush,
  // achievement-only
  Flame, Zap, Trophy, Crown, Medal, Sparkles, Sprout, CircleCheck, LayoutGrid,
};

export const HABIT_ICON_CHOICES = Object.keys(ICONS).slice(0, 25);

export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Target;
  return <I className={className} />;
}

export const COLORS: HabitColor[] = ["coral", "amber", "green", "teal", "blue", "pink"];
export const colorVar = (c: HabitColor) => `var(--habit-${c})`;
