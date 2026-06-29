import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";
import bgHero from "@/assets/bg-hero.jpg";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (role === "parent") nav({ to: "/parent-portal" });
  }, [user, role, loading, nav]);

  if (loading || !user || role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col relative">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-[0.08] dark:opacity-[0.12]"
            style={{ backgroundImage: `url(${bgHero})` }}
          />
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-background/60 via-background/85 to-background/70" />
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <span className="font-display text-lg font-semibold text-foreground">Bhest Brhain Academy</span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
