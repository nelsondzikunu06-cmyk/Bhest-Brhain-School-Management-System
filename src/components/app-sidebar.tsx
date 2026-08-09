import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Wallet, ClipboardCheck, GraduationCap,
  FileText, Megaphone, LogOut, Sun, Moon, School, UserCog, ShieldCheck,
  Brain, MessageSquare, IdCard, ScanLine,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Staff", url: "/staff", icon: UserCog },
  { title: "Fees", url: "/fees", icon: Wallet },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Grades", url: "/grades", icon: GraduationCap },
  { title: "Report Cards", url: "/report-cards", icon: FileText },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Roles", url: "/roles", icon: ShieldCheck },
];

const smartItems = [
  { title: "AI Insights", url: "/insights", icon: Brain },
  { title: "Parent Messages", url: "/messages", icon: MessageSquare },
  { title: "ID Cards", url: "/id-cards", icon: IdCard },
  { title: "QR Scanner", url: "/scanner", icon: ScanLine },
];


export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <School className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-display text-base font-bold text-sidebar-foreground">Bhest Brhain Academy</p>
            <p className="truncate text-[10px] text-sidebar-foreground/60">Admin Console</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = pathname === it.url || pathname.startsWith(it.url + "/");
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.url} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4" />
                        <span>{it.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border p-2">
        <Button variant="ghost" size="sm" onClick={toggle} className="justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          <span className="group-data-[collapsible=icon]:hidden">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="mr-2 h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
