import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarCheck2, ListTodo, Settings, Trophy, Waves } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { hydrate, onAchievementUnlock, useAppState, useHydrated } from "@/lib/habits/store";
import { ACHIEVEMENTS } from "@/lib/habits/achievements";
import { HabitIcon } from "@/lib/habits/icons";

const NAV = [
  { to: "/", label: "Today", icon: CalendarCheck2 },
  { to: "/habits", label: "Habits", icon: ListTodo },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/achievements", label: "Awards", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function useThemeSync() {
  const { settings } = useAppState();
  const ready = useHydrated();
  useEffect(() => {
    if (!ready) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      localStorage.setItem("habitflow:theme", settings.theme);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, ready]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const ready = useHydrated();
  useEffect(() => {
    onAchievementUnlock((ids) => {
      ids.forEach((id) => {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (!a) return;
        toast(
          <div className="flex items-center gap-3">
            <div className="animate-unlock grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <HabitIcon name={a.icon} className="size-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">Achievement unlocked</div>
              <div className="font-display font-bold">{a.title}</div>
              <div className="text-xs text-muted-foreground">+{a.xp} XP · {a.description}</div>
            </div>
          </div>,
          { duration: 4500 },
        );
      });
    });
    hydrate();
  }, []);
  useThemeSync();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Waves className="size-5" /></div>
          <span className="font-display text-lg font-bold tracking-tight">HabitFlow</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: I }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}>
              <I className="size-5" />{label === "Awards" ? "Achievements" : label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-28 sm:px-6 md:pb-12 md:pt-10">
        {ready ? children : <div className="space-y-4 pt-4">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-muted" />)}</div>}
      </main>

      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2">
          {NAV.map(({ to, label, icon: I }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}>
              <I className="size-6" strokeWidth={2.2} />{label}
            </Link>
          ))}
        </div>
      </nav>
      <Toaster position="top-center" />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {subtitle && <p className="text-sm font-semibold text-muted-foreground">{subtitle}</p>}
        <h1 className="truncate text-3xl font-bold sm:text-4xl">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
