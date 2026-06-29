import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Landing,
});

function Landing() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (role === "admin") navigate({ to: "/dashboard" });
    else if (role === "parent") navigate({ to: "/parent-portal" });
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-[oklch(0.30_0.07_265)] text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-display text-xl font-bold">Akasanoma SMS</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a href="/auth" className="rounded-md px-4 py-2 hover:bg-white/10">Admin Login</a>
            <a href="/parent-auth" className="rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground">Parent Login</a>
          </nav>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Complete School Management — Made for Ghana
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-tight md:text-7xl">
            Run your school <span className="text-accent">beautifully.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Students, fees in ₵, attendance, grades, report cards, and a dedicated parent portal — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="/auth" className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground shadow-lg hover:opacity-90">
              Get started
            </a>
            <a href="/parent-auth" className="rounded-lg border border-white/20 px-6 py-3 text-primary-foreground hover:bg-white/10">
              I'm a parent
            </a>
          </div>
        </main>

        <footer className="text-center text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Akasanoma School Management System
        </footer>
      </div>
    </div>
  );
}
