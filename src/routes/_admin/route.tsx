import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";

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
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="font-display text-lg font-semibold text-foreground">Akasanoma School Management</span>
          </header>
          <main className="flex-1 bg-secondary/40 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
