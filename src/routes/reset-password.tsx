import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — HabitFlow" },
      { name: "description", content: "Choose a new password for your HabitFlow account." },
      { property: "og:title", content: "Reset password — HabitFlow" },
      { property: "og:description", content: "Choose a new password for your HabitFlow account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true); });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== pw2) return setError("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><KeyRound className="size-7" /></div>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready && <p className="mt-2 text-sm text-muted-foreground">Open this page from the link in your reset email.</p>}
      </div>
      <form onSubmit={submit} className="card-surface space-y-3 p-5">
        <Input type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12 rounded-xl" />
        <Input type="password" autoComplete="new-password" placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-12 rounded-xl" />
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !ready} className="h-12 w-full rounded-xl font-bold">{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </main>
  );
}
