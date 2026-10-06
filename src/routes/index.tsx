import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import { useAppState } from "@/lib/habits/store";
import { activeHabits, amountOn, currentStreak, dayProgress, isDue, toKey, todayDate, weekDays } from "@/lib/habits/logic";
import { HabitCard } from "@/components/habit/HabitCard";
import { HabitForm } from "@/components/habit/HabitForm";
import { ProgressRing } from "@/components/habit/ProgressRing";
import { EmptyState } from "@/components/habit/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — HabitFlow" },
      { name: "description", content: "See what to do today, tick habits off in one tap and keep your streaks alive." },
      { property: "og:title", content: "Today — HabitFlow" },
      { property: "og:description", content: "See what to do today, tick habits off in one tap and keep your streaks alive." },
    ],
  }),
  component: Today,
});

function greeting(h: number) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Today() {
  const s = useAppState();
  const [open, setOpen] = useState(false);
  const today = todayDate(s.settings.dayStartHour);
  const key = toKey(today);
  const due = activeHabits(s).filter((h) => isDue(h, today));
  const p = dayProgress(s, today);
  const sorted = [...due].sort((a, b) => Number(amountOn(s, a.id, key) >= a.target) - Number(amountOn(s, b.id, key) >= b.target));
  const week = weekDays(today, s.settings.weekStartsMonday);
  const message = p.due === 0 ? "Nothing scheduled" : p.done === p.due ? "Perfect day! 🎉" : p.done === 0 ? "Let's get started" : "Keep the flow going";

  const left = p.due - p.done;
  const subtitle = p.due === 0 ? "Rest, reflect, recharge." : left === 0 ? "Everything done. You showed up today." : p.done === 0 ? "Small steps, every day." : `Only ${left} to go — you've got this.`;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="truncate text-3xl font-bold sm:text-4xl">{greeting(new Date().getHours())}{s.settings.name ? `, ${s.settings.name}` : ""}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button size="icon" onClick={() => setOpen(true)} aria-label="Add habit" className="size-12 rounded-full shadow-float">
          <Plus className="size-6" />
        </Button>
      </header>

      <section className="card-surface flex items-center gap-5 p-5">
        <ProgressRing value={p.rate} size={124} stroke={12}>
          <div className="text-center">
            <div className="font-display text-3xl font-bold">{Math.round(p.rate * 100)}<span className="text-lg">%</span></div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl font-bold">{message}</div>
          <div className="mt-1 text-sm text-muted-foreground">{p.done} of {p.due} completed</div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {week.map((d) => {
              const dp = dayProgress(s, d);
              const isToday = toKey(d) === key;
              const future = d > today;
              return (
                <div key={toKey(d)} className="flex flex-col items-center gap-1">
                  <div className="relative h-10 w-full max-w-5 overflow-hidden rounded-full bg-muted">
                    {!future && <div className="absolute inset-x-0 bottom-0 rounded-full bg-primary transition-all duration-700" style={{ height: `${dp.rate * 100}%` }} />}
                  </div>
                  <span className={cn("text-[10px] font-bold", isToday ? "text-primary" : "text-muted-foreground")}>{format(d, "EEEEE")}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Today's habits</h2>
          <span className="text-sm font-semibold text-muted-foreground">{p.done}/{p.due}</span>
        </div>
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="size-8" />}
            title={s.habits.length ? "A free day" : "Start your first habit"}
            text={s.habits.length ? "Nothing is scheduled for today. Enjoy it — or add something new." : "Small daily actions build big change. Add one habit to begin."}
            action={<Button onClick={() => setOpen(true)} className="h-12 rounded-full px-6 font-bold"><Plus className="size-5" />Add habit</Button>}
          />
        ) : (
          sorted.map((h, i) => (
            <HabitCard key={h.id} index={i} habit={h} dateKey={key} amount={amountOn(s, h.id, key)} streak={currentStreak(s, h, today)} />
          ))
        )}
      </section>
      {sorted.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
          <span className="font-semibold">{p.done === p.due ? "Day complete 🎉" : `${left} habit${left === 1 ? "" : "s"} left today`}</span>
          <span className="font-bold text-primary">{p.done} of {p.due} · {Math.round(p.rate * 100)}%</span>
        </div>
      )}
      <HabitForm open={open} onOpenChange={setOpen} />
    </div>
  );
}
