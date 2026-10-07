import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — HabitFlow" },
      { name: "description", content: "Sign in or create a HabitFlow account to track your habits on every device." },
      { property: "og:title", content: "Sign in — HabitFlow" },
      { property: "og:description", content: "Sign in or create a HabitFlow account to track your habits on every device." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";
const email = z.string().trim().email("Please enter a valid email address.").max(255);
const password = z.string().min(8, "Password must be at least 8 characters.").max(72);

function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/already registered/i.test(msg)) return "An account with this email already exists. Try signing in.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  return msg;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/", replace: true }); });
  }, [navigate]);

  const switchMode = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    const em = email.safeParse(form.email);
    if (!em.success) return setError(em.error.issues[0]!.message);
    if (mode !== "forgot") {
      const pw = password.safeParse(form.password);
      if (!pw.success) return setError(pw.error.issues[0]!.message);
    }
    if (mode === "signup" && form.name.trim().length > 60) return setError("Name must be 60 characters or fewer.");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: form.password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: em.data, password: form.password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: form.name.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/", replace: true });
        else { setInfo("Check your email to confirm your account, then sign in."); setMode("signin"); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setInfo("If an account exists for that email, a reset link is on its way.");
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-float"><Waves className="size-7" /></div>
        <h1 className="text-3xl font-bold">HabitFlow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Welcome back. Keep the flow going." : mode === "signup" ? "Create your account to start building habits." : "We'll email you a link to reset your password."}
        </p>
      </div>

      {mode !== "forgot" && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              className={cn("h-11 rounded-xl text-sm font-semibold transition-all", mode === m ? "bg-card shadow-card" : "text-muted-foreground")}>
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="card-surface space-y-3 p-5" noValidate>
        {mode === "signup" && (
          <Input placeholder="Your name (optional)" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl" />
        )}
        <Input type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-xl" />
        {mode !== "forgot" && (
          <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-12 rounded-xl" />
        )}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
        {info && <p role="status" className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold">{info}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-bold">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm">
        {mode === "signin" && <button type="button" onClick={() => switchMode("forgot")} className="font-semibold text-primary">Forgot password?</button>}
        {mode === "forgot" && <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-primary">Back to sign in</button>}
      </div>
    </main>
  );
}
