import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCedis } from "@/lib/format";
import { LogOut, Sun, Moon, GraduationCap } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { format } from "date-fns";

export const Route = createFileRoute("/parent-portal")({ ssr: false, component: ParentPortal });

function ParentPortal() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/parent-auth" });
    else if (role === "admin") nav({ to: "/dashboard" });
  }, [user, role, loading, nav]);

  // Auto-link by email match via SECURITY DEFINER RPC (only touches parent_user_id).
  useEffect(() => {
    if (!user || linkChecked) return;
    (async () => {
      await supabase.rpc("claim_students_by_email");
      setLinkChecked(true);
    })();
  }, [user, linkChecked]);


  const { data: children = [], refetch } = useQuery({
    queryKey: ["my-children", user?.id, linkChecked],
    queryFn: async () => (await supabase.from("students").select("*").eq("parent_user_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["parent-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  async function signOut() { await supabase.auth.signOut(); nav({ to: "/parent-auth" }); }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground"><GraduationCap className="h-5 w-5" /></div>
            <div><p className="font-display text-lg font-bold">Parent Portal</p><p className="text-xs text-primary-foreground/70">{user.email}</p></div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={toggle} className="text-primary-foreground hover:bg-white/10">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            <Button size="sm" variant="ghost" onClick={signOut} className="text-primary-foreground hover:bg-white/10"><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {!children.length && (
          <Card>
            <CardHeader><CardTitle>No child linked yet</CardTitle><CardDescription>Ask the school admin to register your child with this email address: <strong>{user.email}</strong></CardDescription></CardHeader>
            <CardContent><Button variant="outline" onClick={async () => {
              await supabase.rpc("claim_students_by_email");
              await refetch();
            }}>Refresh</Button></CardContent>

          </Card>
        )}

        {children.map((c: any) => (
          <ChildCard key={c.id} child={c} />
        ))}

        <Card>
          <CardHeader><CardTitle>School Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-md border p-3">
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPP")}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{a.body}</p>
              </div>
            ))}
            {!announcements.length && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function ChildCard({ child }: { child: any }) {
  const { data: grades = [] } = useQuery({
    queryKey: ["child-grades", child.id],
    queryFn: async () => (await supabase.from("grades").select("*").eq("student_id", child.id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: att = [] } = useQuery({
    queryKey: ["child-att", child.id],
    queryFn: async () => (await supabase.from("attendance").select("*").eq("student_id", child.id)).data ?? [],
  });
  const { data: fees = [] } = useQuery({
    queryKey: ["child-fees", child.id],
    queryFn: async () => (await supabase.from("fees").select("*").eq("student_id", child.id).order("payment_date", { ascending: false })).data ?? [],
  });
  const present = att.filter((a: any) => a.status === "present").length;
  const rate = att.length ? Math.round((present / att.length) * 100) : 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-accent"><AvatarImage src={child.photo_url ?? undefined} /><AvatarFallback>{child.full_name.charAt(0)}</AvatarFallback></Avatar>
          <div>
            <CardTitle className="font-display text-2xl">{child.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{child.class} • Enrolled {child.enrollment_date}</p>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-4 text-right">
            <div><p className="text-xs text-muted-foreground">Fee Balance</p><p className="font-display text-xl font-bold">{formatCedis(child.fee_balance)}</p></div>
            <div><p className="text-xs text-muted-foreground">Attendance</p><p className="font-display text-xl font-bold">{rate}%</p></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grades">
          <TabsList><TabsTrigger value="grades">Grades</TabsTrigger><TabsTrigger value="att">Attendance</TabsTrigger><TabsTrigger value="fees">Payments</TabsTrigger></TabsList>
          <TabsContent value="grades">
            <Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Year</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
              <TableBody>{grades.map((g: any) => (<TableRow key={g.id}><TableCell>{g.subject}</TableCell><TableCell>{g.term}</TableCell><TableCell>{g.academic_year}</TableCell><TableCell className="text-right font-mono">{g.score}</TableCell></TableRow>))}
              {!grades.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No grades yet.</TableCell></TableRow>}
              </TableBody></Table>
          </TabsContent>
          <TabsContent value="att">
            <p className="text-sm">Present: <strong>{present}</strong> / {att.length} days ({rate}%)</p>
          </TabsContent>
          <TabsContent value="fees">
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>{fees.map((f: any) => (<TableRow key={f.id}><TableCell>{f.payment_date}</TableCell><TableCell>{f.payment_method}</TableCell><TableCell className="text-right font-mono">{formatCedis(f.amount_paid)}</TableCell><TableCell className="text-right font-mono">{formatCedis(f.balance)}</TableCell></TableRow>))}
              {!fees.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payments yet.</TableCell></TableRow>}
              </TableBody></Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
