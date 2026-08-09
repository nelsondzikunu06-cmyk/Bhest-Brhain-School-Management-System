import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeAtRiskStudents, getRiskMetrics } from "@/lib/insights.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCedis } from "@/lib/format";
import { format } from "date-fns";
import { Brain, Sparkles, TrendingDown, TrendingUp, AlertTriangle, CalendarX, Target } from "lucide-react";

export const Route = createFileRoute("/_admin/insights")({
  ssr: false,
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "AI Insights & Early Warning | Bhest Brhain Academy" },
      { name: "description", content: "AI-powered early warning that flags at-risk students from grades, attendance and fees, with recommended interventions." },
      { property: "og:title", content: "AI Insights & Early Warning" },
      { property: "og:description", content: "Spot struggling students before results day with AI-generated risk analysis and interventions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const LEVEL_STYLES: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500 text-white",
  medium: "bg-yellow-400 text-yellow-950",
  low: "bg-emerald-500 text-white",
};

type Insight = {
  id: string;
  student_id: string | null;
  risk_level: string;
  risk_score: number;
  headline: string;
  summary: string;
  actions: unknown;
  metrics: any;
  created_at: string;
};

function InsightsPage() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeAtRiskStudents);
  const metricsFn = useServerFn(getRiskMetrics);
  const [filter, setFilter] = useState<string>("all");

  const { data: metricsData } = useQuery({
    queryKey: ["risk-metrics"],
    queryFn: () => metricsFn({ data: undefined as never }),
  });

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_insights")
        .select("*")
        .order("risk_score", { ascending: false });
      return (data ?? []) as unknown as Insight[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-lite"],
    queryFn: async () => (await supabase.from("students").select("id, full_name, class, student_code")).data ?? [],
  });
  const nameOf = (id: string | null) => students.find((s: any) => s.id === id)?.full_name ?? "Student";

  const run = useMutation({
    mutationFn: () => analyze({ data: { limit: 12 } }),
    onSuccess: (r: any) => {
      toast.success(r?.message ?? "Analysis complete");
      qc.invalidateQueries({ queryKey: ["ai-insights"] });
      qc.invalidateQueries({ queryKey: ["risk-metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Analysis failed"),
  });

  const metrics = metricsData?.metrics ?? [];
  const counts = {
    critical: insights.filter((i) => i.risk_level === "critical").length,
    high: insights.filter((i) => i.risk_level === "high").length,
    medium: insights.filter((i) => i.risk_level === "medium").length,
    low: insights.filter((i) => i.risk_level === "low").length,
  };

  const shown = filter === "all" ? insights : insights.filter((i) => i.risk_level === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
            <Brain className="h-6 w-6 text-primary" /> AI Insights &amp; Early Warning
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-references grades, attendance and fees to flag students who need help — before results day.
          </p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending} className="w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4" />
          {run.isPending ? "Analysing…" : "Run AI analysis"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["Critical", counts.critical, "text-destructive", AlertTriangle],
          ["High risk", counts.high, "text-amber-500", TrendingDown],
          ["Watchlist", counts.medium, "text-yellow-500", CalendarX],
          ["Stable", counts.low, "text-emerald-500", TrendingUp],
        ] as const).map(([label, value, color, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-bold">{value}</p>
              </div>
              <Icon className={`h-6 w-6 ${color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "critical", "high", "medium", "low"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No AI insights yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Run the analysis to have AI review every active student's grade trend, attendance rate and fee balance,
              then rank who needs attention first.
            </p>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <Sparkles className="mr-2 h-4 w-4" /> Run AI analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((i) => {
            const actions: string[] = Array.isArray(i.actions) ? (i.actions as string[]) : [];
            const m = i.metrics ?? {};
            return (
              <Card key={i.id} className="overflow-hidden">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{nameOf(i.student_id)}</CardTitle>
                      <CardDescription className="truncate">
                        {m.class ?? ""} {m.code ? `· ${m.code}` : ""}
                      </CardDescription>
                    </div>
                    <Badge className={LEVEL_STYLES[i.risk_level] ?? ""}>{i.risk_level}</Badge>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Risk score</span><span>{i.risk_score}/100</span>
                    </div>
                    <Progress value={i.risk_score} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-semibold">{i.headline}</p>
                  <p className="text-muted-foreground">{i.summary}</p>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Attendance</p><p className="font-semibold">{m.attendance_rate ?? "—"}%</p></div>
                    <div><p className="text-muted-foreground">Avg score</p><p className="font-semibold">{m.avg_score ?? "—"}</p></div>
                    <div><p className="text-muted-foreground">Trend</p><p className={`font-semibold ${Number(m.trend) < 0 ? "text-destructive" : "text-emerald-600"}`}>{Number(m.trend) > 0 ? "+" : ""}{m.trend ?? 0}</p></div>
                    <div><p className="text-muted-foreground">Balance</p><p className="font-semibold">{formatCedis(m.fee_balance ?? 0)}</p></div>
                  </div>

                  {actions.length > 0 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Target className="h-3 w-3" /> Recommended actions
                      </p>
                      <ul className="space-y-1">
                        {actions.map((a, k) => (
                          <li key={k} className="flex gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Generated {format(new Date(i.created_at), "PPp")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live risk signals (no AI required)</CardTitle>
            <CardDescription>Rule-based ranking recalculated from your data on every visit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.slice(0, 8).map((m: any) => (
              <div key={m.student_id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.class} · {m.attendance_rate}% attendance · avg {m.avg_score}
                  </p>
                </div>
                <div className="w-24 shrink-0 sm:w-40"><Progress value={m.heuristic_score} /></div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold">{m.heuristic_score}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
