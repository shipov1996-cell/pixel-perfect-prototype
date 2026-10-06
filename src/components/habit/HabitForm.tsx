import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Category, Habit, HabitColor } from "@/lib/habits/types";
import { COLORS, HABIT_ICON_CHOICES, HabitIcon, colorVar } from "@/lib/habits/icons";
import { actions, validateHabit, type HabitInput } from "@/lib/habits/store";
import { toast } from "sonner";
import { DOW, toKey } from "@/lib/habits/logic";
import { cn } from "@/lib/utils";

const CATEGORIES: Category[] = ["Health", "Fitness", "Study", "Productivity", "Personal"];
const QUICK: Array<Pick<HabitInput, "name" | "icon" | "color" | "category">> = [
  { name: "Drink water", icon: "Droplets", color: "blue", category: "Health" },
  { name: "Walk 10k steps", icon: "Footprints", color: "green", category: "Fitness" },
  { name: "Read", icon: "BookOpen", color: "amber", category: "Study" },
  { name: "Meditate", icon: "Brain", color: "teal", category: "Personal" },
  { name: "Sleep by 11", icon: "Bed", color: "pink", category: "Health" },
  { name: "Deep work", icon: "Target", color: "coral", category: "Productivity" },
];

const blank = (): HabitInput => ({
  name: "", icon: "Target", color: "coral", description: "", category: "Health", frequency: { type: "daily" },
  target: 1, unit: "", reminder: { enabled: false, time: "08:00" }, startDate: toKey(new Date()),
});

function Label({ children }: { children: import("react").ReactNode }) {
  return <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</div>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: import("react").ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-10 rounded-full px-4 text-sm font-semibold transition-colors", active ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent")}>
      {children}
    </button>
  );
}

export function HabitForm({ open, onOpenChange, habit }: { open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit }) {
  const [f, setF] = useState<HabitInput>(blank);
  useEffect(() => { if (open) setF(habit ? { ...habit } : blank()); }, [open, habit]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) setError(null); }, [open]);
  const up = (p: Partial<HabitInput>) => { setError(null); setF((x) => ({ ...x, ...p })); };
  const c = colorVar(f.color);

  const save = () => {
    const data = { ...f, name: f.name.trim(), description: f.description.trim(), unit: f.unit.trim() };
    const err = validateHabit(data);
    if (err) { setError(err); return; }
    try {
      if (habit) actions.updateHabit(habit.id, data); else actions.createHabit(data);
      toast.success(habit ? "Habit updated" : `“${data.name}” added`);
      onOpenChange(false);
    } catch {
      setError("Something went wrong saving this habit. Please try again.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-xl">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-xl">{habit ? "Edit habit" : "New habit"}</DrawerTitle>
          <DrawerDescription>{habit ? "Fine-tune the details." : "Type a name and hit save — everything else is optional."}</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6 overflow-y-auto px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c }}>
              <HabitIcon name={f.icon} className="size-7" />
            </div>
            <Input autoFocus value={f.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. Drink water" maxLength={60} aria-invalid={!!error && !f.name.trim()} className="h-14 rounded-2xl text-lg font-semibold" />
          </div>

          {!habit && !f.name && (
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q.name} type="button" onClick={() => up(q)} className="flex h-10 items-center gap-2 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-accent">
                  <HabitIcon name={q.icon} className="size-4" />{q.name}
                </button>
              ))}
            </div>
          )}

          <div>
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {HABIT_ICON_CHOICES.map((i) => (
                <button key={i} type="button" onClick={() => up({ icon: i })} aria-label={i}
                  className="grid aspect-square place-items-center rounded-xl transition-colors"
                  style={{ background: f.icon === i ? `color-mix(in oklab, ${c} 20%, transparent)` : "var(--muted)", color: f.icon === i ? c : undefined }}>
                  <HabitIcon name={i} className="size-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex gap-3">
              {COLORS.map((col: HabitColor) => (
                <button key={col} type="button" aria-label={col} onClick={() => up({ color: col })} className="grid size-10 place-items-center rounded-full transition-transform active:scale-90" style={{ background: colorVar(col) }}>
                  {f.color === col && <Check className="size-5 text-card" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => <Chip key={cat} active={f.category === cat} onClick={() => up({ category: cat })}>{cat}</Chip>)}
            </div>
          </div>

          <div>
            <Label>Frequency</Label>
            <div className="flex flex-wrap gap-2">
              <Chip active={f.frequency.type === "daily"} onClick={() => up({ frequency: { type: "daily" } })}>Every day</Chip>
              <Chip active={f.frequency.type === "weekdays"} onClick={() => up({ frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] } })}>Specific days</Chip>
              <Chip active={f.frequency.type === "custom"} onClick={() => up({ frequency: { type: "custom", interval: 2 } })}>Every N days</Chip>
            </div>
            {f.frequency.type === "weekdays" && (
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const fr = f.frequency as { type: "weekdays"; days: number[] };
                  const on = fr.days.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => up({ frequency: { type: "weekdays", days: on ? fr.days.filter((x) => x !== d) : [...fr.days, d] } })}
                      className="h-11 rounded-xl text-xs font-bold transition-colors" style={{ background: on ? c : "var(--muted)", color: on ? "var(--card)" : undefined }}>
                      {DOW[d]}
                    </button>
                  );
                })}
              </div>
            )}
            {f.frequency.type === "custom" && (
              <div className="mt-3 flex items-center gap-3 text-sm font-semibold">
                Every
                <Input type="number" min={1} max={30} value={f.frequency.interval} onChange={(e) => up({ frequency: { type: "custom", interval: Math.max(1, +e.target.value) } })} className="h-11 w-20 rounded-xl text-center" />
                days
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Daily target</Label>
              <Input type="number" value={f.target || ""} min={1} max={1000} step={1} onChange={(e) => up({ target: e.target.value === "" ? 0 : Math.floor(+e.target.value) })} className="h-11 rounded-xl" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={f.unit} onChange={(e) => up({ unit: e.target.value })} placeholder="times, pages…" className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={f.startDate} onChange={(e) => up({ startDate: e.target.value || toKey(new Date()) })} className="h-11 rounded-xl" />
            </div>
            <div>
              <Label>Reminder</Label>
              <div className="flex h-11 items-center gap-2">
                <Switch checked={f.reminder.enabled} onCheckedChange={(v) => up({ reminder: { ...f.reminder, enabled: v } })} />
                <Input type="time" disabled={!f.reminder.enabled} value={f.reminder.time} onChange={(e) => up({ reminder: { ...f.reminder, time: e.target.value } })} className="h-11 rounded-xl" />
              </div>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={f.description} onChange={(e) => up({ description: e.target.value })} placeholder="Why does this matter to you?" className="rounded-xl" />
          </div>

          {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
          <Button type="submit" className="h-14 w-full rounded-2xl text-base font-bold">
            {habit ? "Save changes" : "Add habit"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
