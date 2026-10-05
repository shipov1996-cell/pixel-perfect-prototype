import { useRef, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CalendarDays, Clock, Download, Info, Monitor, Moon, Sun, Trash2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { actions, useAppState } from "@/lib/habits/store";
import type { ThemePref } from "@/lib/habits/types";
import { PageHeader } from "@/components/habit/AppShell";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HabitFlow" },
      { name: "description", content: "Theme, notifications, week start and data options for HabitFlow." },
      { property: "og:title", content: "Settings — HabitFlow" },
      { property: "og:description", content: "Theme, notifications, week start and data options for HabitFlow." },
    ],
  }),
  component: SettingsPage,
});

function Row({ icon, label, hint, children }: { icon: ReactNode; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-3 p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1"><div className="font-semibold">{label}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { settings } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const themes: { v: ThemePref; label: string; icon: ReactNode }[] = [
    { v: "light", label: "Light", icon: <Sun className="size-4" /> },
    { v: "dark", label: "Dark", icon: <Moon className="size-4" /> },
    { v: "system", label: "System", icon: <Monitor className="size-4" /> },
  ];

  const toggleNotifications = async (v: boolean) => {
    if (v && "Notification" in window && Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") { toast("Notifications are blocked in your browser settings."); return; }
    }
    actions.updateSettings({ notifications: v });
  };

  const exportData = () => {
    const blob = new Blob([actions.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `habitflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try { actions.importData(await file.text()); toast.success("Data imported"); }
    catch { toast.error("That file couldn't be imported"); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      <section className="card-surface p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Appearance</div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
          {themes.map((t) => (
            <button key={t.v} onClick={() => actions.updateSettings({ theme: t.v })}
              className={cn("flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all", settings.theme === t.v ? "bg-card shadow-card" : "text-muted-foreground")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface divide-y">
        <Row icon={<User className="size-5" />} label="Your name">
          <Input value={settings.name} onChange={(e) => actions.updateSettings({ name: e.target.value })} placeholder="Optional" className="h-10 w-36 rounded-xl" />
        </Row>
        <Row icon={<Bell className="size-5" />} label="Reminders" hint="Notifications for habit reminders">
          <Switch checked={settings.notifications} onCheckedChange={toggleNotifications} />
        </Row>
        <Row icon={<Bell className="size-5" />} label="Daily summary" hint="Evening recap of your day">
          <Switch checked={settings.dailySummary} onCheckedChange={(v) => actions.updateSettings({ dailySummary: v })} />
        </Row>
        <Row icon={<CalendarDays className="size-5" />} label="Week starts Monday">
          <Switch checked={settings.weekStartsMonday} onCheckedChange={(v) => actions.updateSettings({ weekStartsMonday: v })} />
        </Row>
        <Row icon={<Clock className="size-5" />} label="Day starts at" hint="For night owls — late check-ins count for yesterday">
          <select value={settings.dayStartHour} onChange={(e) => actions.updateSettings({ dayStartHour: +e.target.value })} className="h-10 rounded-xl border bg-card px-3 text-sm font-semibold">
            {[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
          </select>
        </Row>
      </section>

      <section className="card-surface divide-y">
        <Row icon={<Download className="size-5" />} label="Export data" hint="Download a backup file">
          <Button variant="secondary" onClick={exportData} className="rounded-xl">Export</Button>
        </Row>
        <Row icon={<Upload className="size-5" />} label="Import data" hint="Restore from a backup file">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="rounded-xl">Import</Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </Row>
        <Row icon={<Trash2 className="size-5" />} label="Reset all data" hint="Removes every habit and its history">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" className="rounded-xl">Reset</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                <AlertDialogDescription>This deletes all habits, history and achievements. It can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { actions.reset(); toast("All data cleared"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-center gap-3">
          <Info className="size-5 text-muted-foreground" />
          <div>
            <div className="font-display font-bold">HabitFlow 1.0</div>
            <div className="text-sm text-muted-foreground">Your data stays on this device. Add HabitFlow to your home screen for an app-like experience.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
