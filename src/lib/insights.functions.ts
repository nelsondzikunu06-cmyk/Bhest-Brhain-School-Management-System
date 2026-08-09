import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StudentRow = {
  id: string;
  full_name: string;
  class: string;
  student_code: string | null;
  fee_balance: number | string;
  status: string;
};

export type StudentMetrics = {
  student_id: string;
  name: string;
  class: string;
  code: string | null;
  attendance_rate: number;
  absences: number;
  lates: number;
  avg_score: number;
  gpa: number;
  trend: number;
  subjects_below_50: string[];
  fee_balance: number;
  heuristic_score: number;
};

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function gpaPoints(score: number): number {
  if (score >= 90) return 4.0;
  if (score >= 80) return 3.7;
  if (score >= 75) return 3.3;
  if (score >= 70) return 3.0;
  if (score >= 65) return 2.7;
  if (score >= 60) return 2.3;
  if (score >= 55) return 2.0;
  if (score >= 50) return 1.7;
  if (score >= 45) return 1.3;
  if (score >= 40) return 1.0;
  return 0;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify your permissions.");
  if (!isAdmin) throw new Error("Forbidden");
}

/** Build per-student risk metrics from grades, attendance and fees. */
async function buildMetrics(supabase: any): Promise<StudentMetrics[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const [studentsRes, attRes, gradesRes] = await Promise.all([
    supabase.from("students").select("id, full_name, class, student_code, fee_balance, status").eq("status", "Active"),
    supabase.from("attendance").select("student_id, status, date").gte("date", sinceStr),
    supabase.from("grades").select("student_id, subject, score, term, academic_year, created_at").order("created_at", { ascending: true }),
  ]);

  const students: StudentRow[] = studentsRes.data ?? [];
  const attendance: { student_id: string; status: string }[] = attRes.data ?? [];
  const grades: { student_id: string; subject: string; score: number | string; term: string }[] = gradesRes.data ?? [];

  const attBy = new Map<string, { present: number; absent: number; late: number; total: number }>();
  for (const a of attendance) {
    const e = attBy.get(a.student_id) ?? { present: 0, absent: 0, late: 0, total: 0 };
    e.total += 1;
    const s = (a.status || "").toLowerCase();
    if (s === "present") e.present += 1;
    else if (s === "late") { e.late += 1; e.present += 1; }
    else e.absent += 1;
    attBy.set(a.student_id, e);
  }

  const gradesBy = new Map<string, { subject: string; score: number; term: string }[]>();
  for (const g of grades) {
    const arr = gradesBy.get(g.student_id) ?? [];
    arr.push({ subject: g.subject, score: toNum(g.score), term: g.term });
    gradesBy.set(g.student_id, arr);
  }

  return students.map((s) => {
    const a = attBy.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
    const rate = a.total ? Math.round((a.present / a.total) * 100) : 100;
    const gs = gradesBy.get(s.id) ?? [];
    const scores = gs.map((g) => g.score);
    const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
    const gpa = scores.length ? scores.map(gpaPoints).reduce((x, y) => x + y, 0) / scores.length : 0;

    // Trend: last third vs first third of recorded scores.
    let trend = 0;
    if (scores.length >= 4) {
      const k = Math.max(2, Math.floor(scores.length / 3));
      const first = scores.slice(0, k);
      const last = scores.slice(-k);
      trend =
        last.reduce((x, y) => x + y, 0) / last.length - first.reduce((x, y) => x + y, 0) / first.length;
    }

    const weak = [...new Set(gs.filter((g) => g.score < 50).map((g) => g.subject))].slice(0, 6);
    const balance = toNum(s.fee_balance);

    // Heuristic 0-100 risk score (higher = more at risk).
    let risk = 0;
    if (scores.length) risk += Math.max(0, (60 - avg)) * 0.9;
    risk += Math.max(0, 90 - rate) * 0.8;
    if (trend < 0) risk += Math.min(20, Math.abs(trend));
    risk += Math.min(15, weak.length * 4);
    if (balance > 0) risk += 5;
    risk = Math.max(0, Math.min(100, Math.round(risk)));

    return {
      student_id: s.id,
      name: s.full_name,
      class: s.class,
      code: s.student_code,
      attendance_rate: rate,
      absences: a.absent,
      lates: a.late,
      avg_score: Math.round(avg * 10) / 10,
      gpa: Math.round(gpa * 100) / 100,
      trend: Math.round(trend * 10) / 10,
      subjects_below_50: weak,
      fee_balance: balance,
      heuristic_score: risk,
    };
  });
}

export const getRiskMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const metrics = await buildMetrics(context.supabase);
    metrics.sort((a, b) => b.heuristic_score - a.heuristic_score);
    return { metrics };
  });

const AnalyzeInput = z.object({ limit: z.number().min(1).max(40).default(12) });

export const analyzeAtRiskStudents = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const all = await buildMetrics(context.supabase);
    if (!all.length) return { created: 0, message: "No active students to analyse yet." };

    all.sort((a, b) => b.heuristic_score - a.heuristic_score);
    const cohort = all.slice(0, data.limit);

    const { streamText } = await import("ai");
    const { createGateway, AI_MODEL, AI_PROVIDER_OPTIONS, parseJsonLoose } = await import("./ai-gateway.server");
    const gateway = createGateway();

    const prompt = [
      "You are the academic early-warning analyst for Bhest Brhain Academy, a school in Ghana.",
      "Below is anonymised-by-id performance data for students. Currency is Ghana cedis (GHS).",
      "For EACH student return one object with these keys:",
      '"student_id" (copy exactly), "risk_level" (one of: low, medium, high, critical),',
      '"risk_score" (integer 0-100), "headline" (max 8 words), "summary" (2-3 sentences, plain English,',
      'written for a school administrator, referencing the actual numbers), and "actions" (array of 2-4 short,',
      "concrete intervention steps a teacher or head-teacher can take this week).",
      "Weigh falling score trends and low attendance most heavily; fee balance is a secondary welfare signal.",
      "Respond with ONLY a JSON array. No prose, no markdown fences.",
      "",
      JSON.stringify(cohort),
    ].join("\n");

    const result = streamText({
      model: gateway.responses(AI_MODEL),
      prompt,
      providerOptions: AI_PROVIDER_OPTIONS as any,
    });

    let text: string;
    try {
      text = await result.text;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) throw new Error("AI is busy right now — please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits are exhausted. Add credits to continue.");
      throw new Error("The AI analysis could not be completed. Please try again.");
    }

    type AiRow = {
      student_id: string;
      risk_level?: string;
      risk_score?: number;
      headline?: string;
      summary?: string;
      actions?: string[];
    };
    const parsed = parseJsonLoose<AiRow[]>(text);
    if (!parsed || !Array.isArray(parsed)) {
      throw new Error("The AI returned an unexpected response. Please try again.");
    }

    const byId = new Map(cohort.map((m) => [m.student_id, m]));
    const levels = new Set(["low", "medium", "high", "critical"]);

    const rows = parsed
      .filter((r) => r && byId.has(r.student_id))
      .map((r) => {
        const m = byId.get(r.student_id)!;
        const level = levels.has(String(r.risk_level).toLowerCase())
          ? String(r.risk_level).toLowerCase()
          : m.heuristic_score >= 70
            ? "critical"
            : m.heuristic_score >= 45
              ? "high"
              : m.heuristic_score >= 25
                ? "medium"
                : "low";
        const score = Math.max(0, Math.min(100, Math.round(Number(r.risk_score ?? m.heuristic_score) || m.heuristic_score)));
        return {
          student_id: r.student_id,
          scope: "student",
          risk_level: level,
          risk_score: score,
          headline: String(r.headline ?? "Performance review").slice(0, 120),
          summary: String(r.summary ?? "").slice(0, 1200) || "No summary returned.",
          actions: (Array.isArray(r.actions) ? r.actions : []).slice(0, 5).map((a) => String(a).slice(0, 240)),
          metrics: m as unknown as Record<string, unknown>,
          generated_by: context.userId,
        };
      });

    if (!rows.length) throw new Error("The AI returned no usable insights. Please try again.");

    await context.supabase
      .from("ai_insights")
      .delete()
      .in("student_id", rows.map((r) => r.student_id));

    const { error } = await context.supabase.from("ai_insights").insert(rows);
    if (error) throw new Error("Insights could not be saved.");

    return { created: rows.length, message: `Analysed ${rows.length} students.` };
  });

const DraftInput = z.object({
  student_id: z.string().uuid(),
  intent: z.string().min(2).max(300),
  tone: z.enum(["warm", "formal", "urgent"]).default("warm"),
});

/** AI-drafts a parent message grounded in the child's real record. */
export const draftParentMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DraftInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { data: student } = await context.supabase
      .from("students")
      .select("full_name, class, parent_name, fee_balance, student_code")
      .eq("id", data.student_id)
      .maybeSingle();
    if (!student) throw new Error("Student not found.");

    const [{ data: grades }, { data: att }] = await Promise.all([
      context.supabase.from("grades").select("subject, score, term").eq("student_id", data.student_id).limit(30),
      context.supabase.from("attendance").select("status, date").eq("student_id", data.student_id).order("date", { ascending: false }).limit(60),
    ]);

    const { streamText } = await import("ai");
    const { createGateway, AI_MODEL, AI_PROVIDER_OPTIONS } = await import("./ai-gateway.server");
    const gateway = createGateway();

    const prompt = [
      "You write messages sent from Bhest Brhain Academy (a school in Ghana) to a parent.",
      `Tone: ${data.tone}. Currency: Ghana cedis (₵).`,
      "Rules: address the parent respectfully, be specific using the data below, keep it under 130 words,",
      "end with a clear next step, and sign off as 'Bhest Brhain Academy'. Return ONLY the message body text.",
      "",
      `Purpose of the message: ${data.intent}`,
      `Student: ${JSON.stringify(student)}`,
      `Recent grades: ${JSON.stringify(grades ?? [])}`,
      `Recent attendance: ${JSON.stringify(att ?? [])}`,
    ].join("\n");

    const result = streamText({
      model: gateway.responses(AI_MODEL),
      prompt,
      providerOptions: AI_PROVIDER_OPTIONS as any,
    });

    let text: string;
    try {
      text = await result.text;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) throw new Error("AI is busy right now — please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits are exhausted. Add credits to continue.");
      throw new Error("The draft could not be generated. Please try again.");
    }

    const draft = text.trim();
    if (!draft) throw new Error("The AI returned an empty draft. Please try again.");
    return { draft };
  });
