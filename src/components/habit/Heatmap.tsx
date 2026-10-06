import { addDays, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subWeeks, startOfWeek } from "date-fns";
import { toKey } from "@/lib/habits/logic";

/** GitHub-style multi-week heatmap. `valueFor` returns 0..1 or -1 for "not due". */
export function WeeksHeatmap({ today, weeks = 17, valueFor, color = "var(--primary)", mondayFirst = true }: {
  today: Date; weeks?: number; valueFor: (d: Date) => number; color?: string; mondayFirst?: boolean;
}) {
  const start = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: mondayFirst ? 1 : 0 });
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((d) => {
            const future = d > today;
            const v = future ? -2 : valueFor(d);
            return (
              <div
                key={toKey(d)}
                title={`${format(d, "MMM d")}${v >= 0 ? ` · ${Math.round(v * 100)}%` : ""}`}
                className="size-3.5 rounded-[4px] sm:size-4"
                style={{
                  background: v <= 0 ? "var(--heat-0)" : `color-mix(in oklab, ${color} ${20 + v * 80}%, var(--heat-0))`,
                  opacity: future ? 0.35 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function MonthHeatmap({ month, today, valueFor, color, mondayFirst = true }: {
  month: Date; today: Date; valueFor: (d: Date) => number; color: string; mondayFirst?: boolean;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const offset = (getDay(days[0]!) - (mondayFirst ? 1 : 0) + 7) % 7;
  const labels = mondayFirst ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {labels.map((l, i) => <div key={i} className="text-[11px] font-semibold text-muted-foreground">{l}</div>)}
      {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
      {days.map((d) => {
        const future = d > today;
        const v = future ? -2 : valueFor(d);
        const isToday = toKey(d) === toKey(today);
        return (
          <div
            key={toKey(d)}
            className="grid aspect-square place-items-center rounded-xl text-xs font-semibold"
            style={{
              background: v > 0 ? `color-mix(in oklab, ${color} ${30 + v * 70}%, var(--heat-0))` : v === -1 ? "transparent" : "var(--heat-0)",
              color: v >= 0.6 ? "var(--card)" : "var(--muted-foreground)",
              opacity: future ? 0.4 : 1,
              outline: isToday ? `2px solid ${color}` : undefined,
              outlineOffset: 1,
            }}
          >
            {format(d, "d")}
          </div>
        );
      })}
    </div>
  );
}
