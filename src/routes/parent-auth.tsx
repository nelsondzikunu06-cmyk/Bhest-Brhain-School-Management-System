import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";

export const Route = createFileRoute("/parent-auth")({ ssr: false, component: ParentAuth });

function ParentAuth() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      nav({ to: "/parent-portal" });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created. Make sure your email matches what the school has on file.");
      nav({ to: "/parent-portal" });
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-accent/90 to-accent p-12 text-accent-foreground md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground"><Users /></div>
          <span className="font-display text-xl font-bold">Parent Portal</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Stay close to your child's progress.</h2>
          <p className="mt-4 text-accent-foreground/80">View grades, attendance, fee balance and school announcements.</p>
        </div>
        <p className="text-xs text-accent-foreground/70">Admin? <a href="/auth" className="underline">Login here</a></p>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Parent Login</CardTitle>
            <CardDescription>Use the email the school registered you with.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2"><Label>Full Name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              )}
              <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : mode === "signin" ? "Sign In" : "Create Account"}</Button>
              <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                {mode === "signin" ? "New here? Create a parent account" : "Have an account? Sign in"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
