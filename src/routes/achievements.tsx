import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { useAppState } from "@/lib/habits/store";
import { ACHIEVEMENTS, achievementXp } from "@/lib/habits/achievements";
import { levelFor, xpFor } from "@/lib/habits/logic";
import { HabitIcon } from "@/lib/habits/icons";
import { PageHeader } from "@/components/habit/AppShell";
import { ProgressRing } from "@/components/habit/ProgressRing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — HabitFlow" },
      { name: "description", content: "Earn XP, level up and unlock milestones as you build habits." },
      { property: "og:title", content: "Achievements — HabitFlow" },
      { property: "og:description", content: "Earn XP, level up and unlock milestones as you build habits." },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const s = useAppState();
  const xp = xpFor(s, achievementXp(s));
  const lv = levelFor(xp);
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  const recent = Date.now() - 10_000;

  return (
    <div className="space-y-5">
      <PageHeader title="Achievements" subtitle={`${unlocked} of ${ACHIEVEMENTS.length} unlocked`} />
      <section className="card-surface flex items-center gap-5 p-5">
        <ProgressRing value={lv.progress} size={112} stroke={10}>
          <div className="text-center leading-none">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level</div>
            <div className="font-display text-4xl font-bold">{lv.level}</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl font-bold">{xp.toLocaleString()} <span className="text-base text-muted-foreground">XP</span></div>
          <div className="mt-1 text-sm text-muted-foreground">{lv.needed - lv.into} XP to level {lv.level + 1}</div>
          <div className="mt-3 h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary transition-all duration-700" style={{ width: `${lv.progress * 100}%` }} /></div>
          <div className="mt-2 text-xs text-muted-foreground">+10 XP per completion · bonus XP for milestones</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = s.achievements[a.id];
          const fresh = at && new Date(at).getTime() > recent;
          return (
            <div key={a.id} className={cn("card-surface flex flex-col items-start p-4", fresh && "animate-unlock", !at && "opacity-60")}>
              <div className={cn("mb-3 grid size-12 place-items-center rounded-2xl", at ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {at ? <HabitIcon name={a.icon} className="size-6" /> : <Lock className="size-5" />}
              </div>
              <div className="font-display font-bold">{a.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
              <div className="mt-3 text-xs font-bold text-primary">{at ? `Unlocked ${format(new Date(at), "MMM d")}` : `+${a.xp} XP`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
