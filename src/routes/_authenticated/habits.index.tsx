import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ChevronRight, Flame, ListTodo, Plus } from "lucide-react";
import { useAppState } from "@/lib/habits/store";
import { currentStreak, frequencyLabel, todayDate } from "@/lib/habits/logic";
import { HabitIcon, colorVar } from "@/lib/habits/icons";
import { HabitForm } from "@/components/habit/HabitForm";
import { EmptyState, PageHeader } from "@/components/habit/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/habits/")({
  head: () => ({
    meta: [
      { title: "Your habits — HabitFlow" },
      { name: "description", content: "Create, edit and organise all your habits by category." },
      { property: "og:title", content: "Your habits — HabitFlow" },
      { property: "og:description", content: "Create, edit and organise all your habits by category." },
    ],
  }),
  component: HabitsPage,
});

function HabitsPage() {
  const s = useAppState();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [showArchived, setShowArchived] = useState(false);
  const today = todayDate(s.settings.dayStartHour);
  const list = s.habits
    .filter((h) => h.archived === showArchived)
    .filter((h) => filter === "All" || h.category === filter)
    .sort((a, b) => a.order - b.order);
  const cats = ["All", ...Array.from(new Set(s.habits.map((h) => h.category)))];
  const archivedCount = s.habits.filter((h) => h.archived).length;

  return (
    <div>
      <PageHeader
        subtitle={`${s.habits.filter((h) => !h.archived).length} active`}
        title="Habits"
        action={<Button onClick={() => setOpen(true)} className="h-11 rounded-full px-5 font-bold"><Plus className="size-5" />New</Button>}
      />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", filter === c ? "bg-foreground text-background" : "bg-muted hover:bg-accent")}>{c}</button>
        ))}
        {archivedCount > 0 && (
          <button onClick={() => setShowArchived((v) => !v)} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold", showArchived ? "bg-primary text-primary-foreground" : "bg-muted")}>
            <Archive className="size-4" />Archived ({archivedCount})
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<ListTodo className="size-8" />} title={showArchived ? "No archived habits" : "No habits yet"} text="Create a habit in seconds — just give it a name."
          action={!showArchived && <Button onClick={() => setOpen(true)} className="h-12 rounded-full px-6 font-bold"><Plus className="size-5" />Create habit</Button>} />
      ) : (
        <div className="space-y-3">
          {list.map((h, i) => {
            const c = colorVar(h.color);
            const streak = currentStreak(s, h, today);
            return (
              <Link key={h.id} to="/habits/$id" params={{ id: h.id }} className="card-surface animate-rise flex items-center gap-4 p-4 transition-transform active:scale-[0.98]" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}>
                  <HabitIcon name={h.icon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{h.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{h.category} · {frequencyLabel(h)}{h.target > 1 ? ` · ${h.target} ${h.unit}` : ""}</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-bold" style={{ color: streak ? c : "var(--muted-foreground)" }}><Flame className="size-4" />{streak}</span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
      <HabitForm open={open} onOpenChange={setOpen} />
    </div>
  );
}
