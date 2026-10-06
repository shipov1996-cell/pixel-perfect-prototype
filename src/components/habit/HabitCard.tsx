import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Flame, Plus } from "lucide-react";
import type { Habit } from "@/lib/habits/types";
import { HabitIcon, colorVar } from "@/lib/habits/icons";
import { actions } from "@/lib/habits/store";
import { cn } from "@/lib/utils";
import { frequencyLabel } from "@/lib/habits/logic";

export function HabitCard({ habit, amount, streak, dateKey, index = 0 }: {
  habit: Habit; amount: number; streak: number; dateKey: string; index?: number;
}) {
  const [anim, setAnim] = useState(0);
  const done = amount >= habit.target;
  const c = colorVar(habit.color);
  const progress = Math.min(1, amount / habit.target);

  const onTap = () => {
    const nowDone = actions.tap(habit.id, dateKey);
    if (nowDone) {
      setAnim((n) => n + 1);
      navigator.vibrate?.(12);
    }
  };

  return (
    <div
      className={cn("card-surface animate-rise relative flex items-center gap-3 overflow-hidden p-3 pr-3 transition-colors sm:gap-4 sm:p-4")}
      style={{ animationDelay: `${index * 40}ms`, background: done ? `color-mix(in oklab, ${c} 10%, var(--card))` : undefined }}
    >
      <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${progress * 100}%`, background: `color-mix(in oklab, ${c} 6%, transparent)` }} />
      <Link to="/habits/$id" params={{ id: habit.id }} className="relative flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}>
          <HabitIcon name={habit.icon} className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[15px] font-bold", done && "text-muted-foreground line-through decoration-2")}>{habit.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: streak ? c : undefined }}>
              <Flame className="size-3.5" />{streak}
            </span>
            <span>·</span>
            <span className="truncate">{habit.target > 1 ? `${amount}/${habit.target} ${habit.unit}` : frequencyLabel(habit)}</span>
          </div>
          {habit.target > 1 && (
            <div className="mt-2 flex gap-1">
              {Array.from({ length: Math.min(habit.target, 12) }, (_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < Math.round(progress * Math.min(habit.target, 12)) ? c : "var(--muted)" }} />
              ))}
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={onTap}
        aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
        className="relative grid size-14 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90"
        style={{ borderColor: done ? c : `color-mix(in oklab, ${c} 35%, var(--border))`, background: done ? c : "transparent", color: done ? "var(--card)" : c }}
      >
        {anim > 0 && <span key={anim} className="animate-burst absolute inset-0 rounded-full" style={{ background: c }} />}
        <span key={`i${anim}`} className={cn(anim > 0 && done && "animate-pop")}>
          {done ? <Check className="size-7" strokeWidth={3} /> : habit.target > 1 ? <Plus className="size-6" strokeWidth={2.5} /> : <Check className="size-6 opacity-40" strokeWidth={2.5} />}
        </span>
      </button>
    </div>
  );
}
