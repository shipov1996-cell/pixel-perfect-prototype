import { createFileRoute } from "@tanstack/react-router";
import { format, subDays } from "date-fns";
import { Award, BarChart3, CheckCircle2, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppState } from "@/lib/habits/store";
import { DOW_LONG, activeHabits, dayProgress, habitRate, overallStats, todayDate, weekDays } from "@/lib/habits/logic";
import { HabitIcon, colorVar } from "@/lib/habits/icons";
import { WeeksHeatmap } from "@/components/habit/Heatmap";
import { EmptyState, PageHeader } from "@/components/habit/AppShell";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — HabitFlow" },
      { name: "description", content: "Weekly and monthly completion, best streaks, heatmaps and insights about your habits." },
      { property: "og:title", content: "Statistics — HabitFlow" },
      { property: "og:description", content: "Weekly and monthly completion, best streaks, heatmaps and insights about your habits." },
    ],
  }),
  component: Stats,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card-surface p-4">
      <div className="mb-3 grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function Stats() {
  const s = useAppState();
  const today = todayDate(s.settings.dayStartHour);
  if (!s.habits.length) {
    return (<><PageHeader title="Statistics" /><EmptyState icon={<BarChart3 className="size-8" />} title="No data yet" text="Complete a few habits and your progress will appear here." /></>);
  }
  const st = overallStats(s, today);
  const week = weekDays(today, s.settings.weekStartsMonday).map((d) => ({ name: format(d, "EEE"), rate: d > today ? 0 : Math.round(dayProgress(s, d).rate * 100) }));
  const month = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i);
    return { name: format(d, "MMM d"), rate: Math.round(dayProgress(s, d).rate * 100) };
  });
  const ranking = activeHabits(s).map((h) => ({ h, r: habitRate(s, h, today, 30) })).sort((a, b) => b.r.rate - a.r.rate);

  return (
    <div className="space-y-5">
      <PageHeader title="Statistics" subtitle="Your progress" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<TrendingUp className="size-5" />} label="This week" value={pct(st.week)} />
        <Tile icon={<BarChart3 className="size-5" />} label="Last 30 days" value={pct(st.month)} />
        <Tile icon={<CheckCircle2 className="size-5" />} label="Total completed" value={st.total} />
        <Tile icon={<Flame className="size-5" />} label="Best streak" value={`${st.best}d`} />
      </div>

      <section className="card-surface p-5">
        <h2 className="font-bold">This week</h2>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v) => [`${v}%`, "Done"]} />
              <Bar dataKey="rate" fill="var(--primary)" radius={[10, 10, 10, 10]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-baseline justify-between"><h2 className="font-bold">Last 30 days</h2><span className="text-xs text-muted-foreground">Completion rate {pct(st.allTime)} (90d)</span></div>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={month}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" interval={6} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v) => [`${v}%`, "Done"]} />
              <Area type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 font-bold">Activity</h2>
        <WeeksHeatmap today={today} mondayFirst={s.settings.weekStartsMonday} valueFor={(d) => { const p = dayProgress(s, d); return p.due ? p.rate : -1; }} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card-surface flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-success"><Award className="size-6" /></div>
          <div><div className="text-xs font-semibold text-muted-foreground">Best day</div><div className="font-display text-lg font-bold">{st.bestDay ? `${DOW_LONG[st.bestDay.dow]} · ${pct(st.bestDay.rate)}` : "—"}</div></div>
        </div>
        <div className="card-surface flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-muted text-destructive"><TrendingDown className="size-6" /></div>
          <div><div className="text-xs font-semibold text-muted-foreground">Needs attention</div><div className="font-display text-lg font-bold">{st.worstDay ? `${DOW_LONG[st.worstDay.dow]} · ${pct(st.worstDay.rate)}` : "—"}</div></div>
        </div>
      </div>

      <section className="card-surface p-5">
        <h2 className="mb-4 font-bold">Habits · 30 days</h2>
        <div className="space-y-4">
          {ranking.map(({ h, r }) => (
            <div key={h.id} className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${colorVar(h.color)} 16%, transparent)`, color: colorVar(h.color) }}><HabitIcon name={h.icon} className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex justify-between text-sm"><span className="truncate font-semibold">{h.name}</span><span className="font-bold">{pct(r.rate)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full transition-all duration-700" style={{ width: pct(r.rate), background: colorVar(h.color) }} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
