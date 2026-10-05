import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { addMonths, format, subDays, subMonths } from "date-fns";
import { Archive, ArchiveRestore, Bell, ChevronLeft, ChevronRight, Pencil, Repeat, Target, Trash2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { actions, useAppState } from "@/lib/habits/store";
import { amountOn, currentStreak, frequencyLabel, habitRate, isDue, isDone, longestStreak, toKey, todayDate, totalCompletions } from "@/lib/habits/logic";
import { HabitIcon, colorVar } from "@/lib/habits/icons";
import { HabitForm } from "@/components/habit/HabitForm";
import { MonthHeatmap } from "@/components/habit/Heatmap";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/habits/$id")({
  head: () => ({
    meta: [
      { title: "Habit details — HabitFlow" },
      { name: "description", content: "Streaks, completion rate, calendar and history for a single habit." },
      { property: "og:title", content: "Habit details — HabitFlow" },
      { property: "og:description", content: "Streaks, completion rate, calendar and history for a single habit." },
    ],
  }),
  component: HabitDetail,
});

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card-surface p-4">
      <div className="font-display text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function HabitDetail() {
  const { id } = Route.useParams();
  const s = useAppState();
  const nav = useNavigate();
  const [edit, setEdit] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const h = s.habits.find((x) => x.id === id);
  if (!h) {
    return (
      <div className="py-20 text-center">
        <p className="font-bold">Habit not found</p>
        <Link to="/habits" className="mt-3 inline-block text-primary">Back to habits</Link>
      </div>
    );
  }
  const today = todayDate(s.settings.dayStartHour);
  const c = colorVar(h.color);
  const all = habitRate(s, h, today);
  const week = habitRate(s, h, today, 7);
  const monthR = habitRate(s, h, today, 30);
  const weeksData = Array.from({ length: 8 }, (_, i) => {
    const end = subDays(today, (7 - i) * 7);
    let done = 0;
    for (let d = 0; d < 7; d++) if (isDone(s, h, toKey(subDays(end, -d - 1 + 7 - 6)))) done++;
    return { name: format(subDays(end, -7), "MMM d"), done };
  });
  const history = Object.entries(s.completions[h.id] ?? {}).filter(([, v]) => v > 0).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/habits" className="-ml-2 flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="size-5" />Habits</Link>
        <Button variant="secondary" onClick={() => setEdit(true)} className="h-10 rounded-full"><Pencil className="size-4" />Edit</Button>
      </div>

      <header className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-3xl" style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}>
          <HabitIcon name={h.icon} className="size-8" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold">{h.name}</h1>
          <p className="text-sm text-muted-foreground">{h.category}{h.archived ? " · Archived" : ""}</p>
        </div>
      </header>
      {h.description && <p className="text-muted-foreground">{h.description}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current streak" value={`${currentStreak(s, h, today)}d`} color={c} />
        <Stat label="Longest streak" value={`${longestStreak(s, h, today)}d`} />
        <Stat label="Completion rate" value={`${Math.round(all.rate * 100)}%`} />
        <Stat label="Total completions" value={totalCompletions(s, h)} />
      </div>

      <section className="card-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{format(month, "MMMM yyyy")}</h2>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft /></Button>
            <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight /></Button>
          </div>
        </div>
        <MonthHeatmap month={month} today={today} color={c} mondayFirst={s.settings.weekStartsMonday}
          valueFor={(d) => (isDue(h, d) ? Math.min(1, amountOn(s, h.id, toKey(d)) / h.target) : -1)} />
        <p className="mt-3 text-xs text-muted-foreground">Tap a past day in Today to log it, or toggle below.</p>
      </section>

      <section className="card-surface p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-bold">Weekly completions</h2>
          <span className="text-xs text-muted-foreground">7d {Math.round(week.rate * 100)}% · 30d {Math.round(monthR.rate * 100)}%</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeksData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
              <Bar dataKey="done" fill={c} radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-surface divide-y">
        <div className="flex items-center gap-3 p-4"><Repeat className="size-5 text-muted-foreground" /><span className="flex-1 font-semibold">Frequency</span><span className="text-sm text-muted-foreground">{frequencyLabel(h)}</span></div>
        <div className="flex items-center gap-3 p-4"><Target className="size-5 text-muted-foreground" /><span className="flex-1 font-semibold">Target</span><span className="text-sm text-muted-foreground">{h.target} {h.unit || (h.target === 1 ? "time" : "times")} / day</span></div>
        <div className="flex items-center gap-3 p-4"><Bell className="size-5 text-muted-foreground" /><span className="flex-1 font-semibold">Reminder</span><span className="text-sm text-muted-foreground">{h.reminder.enabled ? h.reminder.time : "Off"}</span></div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 font-bold">Last 7 days</h2>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i)).map((d) => {
            const k = toKey(d);
            const done = isDone(s, h, k);
            return (
              <button key={k} onClick={() => actions.setAmount(h.id, k, done ? 0 : h.target)} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">{format(d, "EEE")}</span>
                <span className="grid size-10 place-items-center rounded-full text-sm font-bold transition-colors" style={{ background: done ? c : "var(--muted)", color: done ? "var(--card)" : undefined }}>{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
        <h2 className="mb-2 mt-5 font-bold">History</h2>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">No entries yet.</p> : (
          <ul className="divide-y text-sm">
            {history.map(([k, v]) => (
              <li key={k} className="flex justify-between py-2"><span>{format(new Date(k + "T00:00"), "EEE, MMM d")}</span><span className="font-semibold" style={{ color: v >= h.target ? c : undefined }}>{v}/{h.target}{v >= h.target ? " ✓" : ""}</span></li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-12 rounded-2xl" onClick={() => actions.archiveHabit(h.id, !h.archived)}>
          {h.archived ? <><ArchiveRestore className="size-4" />Restore</> : <><Archive className="size-4" />Archive</>}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" className="h-12 rounded-2xl"><Trash2 className="size-4" />Delete</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{h.name}”?</AlertDialogTitle>
              <AlertDialogDescription>All history for this habit will be removed. Archive instead to keep it.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { actions.deleteHabit(h.id); nav({ to: "/habits" }); }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <HabitForm open={edit} onOpenChange={setEdit} habit={h} />
    </div>
  );
}
