import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Wallet, ClipboardCheck, GraduationCap, UserPlus, FileText, Trophy, UserCog } from "lucide-react";
import { formatCedis } from "@/lib/format";
import { averageGpa } from "@/lib/gpa";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { BirthdayCard } from "@/components/birthday-card";

export const Route = createFileRoute("/_admin/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [studentsRes, staffRes, feesRes, todayAtt, recentStudents, gradesRes] = await Promise.all([
        supabase.from("students").select("id,full_name,dob,photo_url,status,created_at"),
        supabase.from("staff").select("id,full_name,dob,photo_url,status"),
        supabase.from("fees").select("amount_paid"),
        supabase.from("attendance").select("status").eq("date", today),
        supabase.from("students").select("id,full_name,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("grades").select("student_id,score,students(full_name,photo_url,class)"),
      ]);
      const students = studentsRes.data ?? [];
      const staff = staffRes.data ?? [];
      const fees = feesRes.data ?? [];
      const att = todayAtt.data ?? [];
      const grades = (gradesRes.data ?? []) as any[];

      const presentCount = att.filter((a) => a.status === "present").length;
      const rate = att.length ? Math.round((presentCount / att.length) * 100) : 0;
      const totalFees = fees.reduce((s, f) => s + Number(f.amount_paid), 0);
      const newToday = students.filter((s) => s.created_at.startsWith(today)).length;

      // Top performers by GPA
      type Agg = { name: string; photo: string | null; klass: string; scores: number[] };
      const byStudent = new Map<string, Agg>();
      for (const g of grades) {
        const cur: Agg = byStudent.get(g.student_id) ?? { name: g.students?.full_name ?? "Unknown", photo: g.students?.photo_url ?? null, klass: g.students?.class ?? "", scores: [] };
        cur.scores.push(Number(g.score));
        byStudent.set(g.student_id, cur);
      }
      const top = Array.from(byStudent.entries())
        .map(([id, v]) => ({ id, ...v, gpa: averageGpa(v.scores), avg: v.scores.reduce((s, n) => s + n, 0) / v.scores.length }))
        .sort((a, b) => b.gpa - a.gpa)
        .slice(0, 5);

      const birthdayPeople = [
        ...students.map((s: any) => ({ id: s.id, full_name: s.full_name, dob: s.dob, photo_url: s.photo_url, kind: "student" as const })),
        ...staff.map((s: any) => ({ id: s.id, full_name: s.full_name, dob: s.dob, photo_url: s.photo_url, kind: "staff" as const })),
      ].filter((p) => p.dob);

      return {
        totalStudents: students.length,
        active: students.filter((s) => s.status === "Active").length,
        totalStaff: staff.length,
        activeStaff: staff.filter((s) => s.status === "Active").length,
        totalFees,
        attendanceRate: rate,
        newToday,
        recent: recentStudents.data ?? [],
        topPerformers: top,
        birthdayPeople,
      };
    },
  });

  const { data: trend } = useQuery({
    queryKey: ["att-trend"],
    queryFn: async () => {
      const days = Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));
      const { data } = await supabase.from("attendance").select("date,status").in("date", days);
      return days.map((d) => {
        const rows = (data ?? []).filter((r) => r.date === d);
        const total = rows.length;
        const present = rows.filter((r) => r.status === "present").length;
        return { day: format(new Date(d), "EEE"), rate: total ? Math.round((present / total) * 100) : 0 };
      });
    },
  });

  const kpis = [
    { label: "Total Students", value: stats?.totalStudents ?? 0, icon: Users, hint: `${stats?.active ?? 0} active` },
    { label: "Total Staff", value: stats?.totalStaff ?? 0, icon: UserCog, hint: `${stats?.activeStaff ?? 0} active` },
    { label: "Fees Collected", value: formatCedis(stats?.totalFees ?? 0), icon: Wallet, hint: "Lifetime" },
    { label: "Attendance Rate", value: `${stats?.attendanceRate ?? 0}%`, icon: ClipboardCheck, hint: "Today" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to Bhest Brhain Academy — overview of your school today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle>
              <div className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-accent"><k.icon className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl sm:text-3xl font-bold text-foreground break-words">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/80 backdrop-blur">
          <CardHeader><CardTitle>Attendance Trend (7 days)</CardTitle><CardDescription>% of students present</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                <Line type="monotone" dataKey="rate" stroke="var(--accent)" strokeWidth={3} dot={{ fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <BirthdayCard people={stats?.birthdayPeople ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" />Top Performers</CardTitle>
            <CardDescription>Highest GPA across all recorded grades</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.topPerformers?.length && <p className="text-sm text-muted-foreground">No grades recorded yet.</p>}
            <div className="space-y-2">
              {stats?.topPerformers?.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold text-sm ${i === 0 ? "bg-accent text-accent-foreground" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-accent/40 text-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {i + 1}
                  </div>
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-muted shrink-0">
                    {p.photo ? <img src={p.photo} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full w-full place-items-center text-sm">{p.name.charAt(0)}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.klass}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-accent">{p.gpa.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{p.avg.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md bg-accent/10 px-3 py-2 text-sm text-foreground">
              <strong>{stats?.newToday ?? 0}</strong> new student(s) added today
            </p>
            {(stats?.recent ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                <span className="font-medium">{s.full_name}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM d")}</span>
              </div>
            ))}
            {!stats?.recent?.length && <p className="text-sm text-muted-foreground">No students yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/80 backdrop-blur">
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="bg-primary text-primary-foreground"><Link to="/students"><UserPlus className="mr-2 h-4 w-4" />Add Student</Link></Button>
          <Button asChild variant="outline"><Link to="/staff"><UserCog className="mr-2 h-4 w-4" />Manage Staff</Link></Button>
          <Button asChild variant="outline"><Link to="/attendance"><ClipboardCheck className="mr-2 h-4 w-4" />Record Attendance</Link></Button>
          <Button asChild variant="outline"><Link to="/grades"><GraduationCap className="mr-2 h-4 w-4" />Enter Grades</Link></Button>
          <Button asChild variant="outline"><Link to="/report-cards"><FileText className="mr-2 h-4 w-4" />Generate Report</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
