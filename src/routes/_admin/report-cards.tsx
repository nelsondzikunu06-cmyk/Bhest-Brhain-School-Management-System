import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES, formatCedis } from "@/lib/format";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/report-cards")({ component: ReportCards });

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(blob); });
  } catch { return null; }
}

function ReportCards() {
  const [klass, setKlass] = useState("Primary 1");
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [generating, setGenerating] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ["rc-students", klass],
    queryFn: async () => (await supabase.from("students").select("*").eq("class", klass).order("full_name")).data ?? [],
  });

  async function generate(studentId: string) {
    setGenerating(true);
    try {
      const student = students.find((s: any) => s.id === studentId);
      if (!student) return;
      const [{ data: grades }, { data: attendance }, { data: classGrades }] = await Promise.all([
        supabase.from("grades").select("*").eq("student_id", studentId).eq("term", term).eq("academic_year", year),
        supabase.from("attendance").select("status").eq("student_id", studentId),
        supabase.from("grades").select("score,student_id").in("student_id", students.map((s: any) => s.id)).eq("term", term).eq("academic_year", year),
      ]);
      const present = (attendance ?? []).filter((a) => a.status === "present").length;
      const totalDays = (attendance ?? []).length;
      const classAvg = classGrades?.length ? classGrades.reduce((s, g) => s + Number(g.score), 0) / classGrades.length : 0;
      const studentAvg = grades?.length ? grades.reduce((s, g) => s + Number(g.score), 0) / grades.length : 0;

      const doc = new jsPDF();
      doc.setFillColor(28, 38, 78);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Bhest Brhain Academy", 14, 16);
      doc.setFontSize(11);
      doc.text(`Report Card — ${term} ${year}`, 14, 26);

      if (student.photo_url) {
        const img = await loadImageDataUrl(student.photo_url);
        if (img) try { doc.addImage(img, "JPEG", 160, 5, 30, 30); } catch {}
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      let y = 48;
      doc.text(`Student: ${student.full_name}`, 14, y);
      doc.text(`Class: ${student.class}`, 14, y + 7);
      doc.text(`Date of Birth: ${student.dob ?? "—"}`, 14, y + 14);
      doc.text(`Parent: ${student.parent_name ?? "—"}`, 110, y);
      doc.text(`Phone: ${student.parent_phone ?? "—"}`, 110, y + 7);

      autoTable(doc, {
        startY: y + 24,
        head: [["Subject", "Score", "Comment"]],
        body: (grades ?? []).map((g) => [g.subject, String(g.score), g.teacher_comment ?? ""]),
        headStyles: { fillColor: [28, 38, 78] },
        theme: "grid",
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Student Average: ${studentAvg.toFixed(1)}`, 14, finalY);
      doc.text(`Class Average: ${classAvg.toFixed(1)}`, 14, finalY + 7);
      doc.text(`Attendance: ${present}/${totalDays} days (${totalDays ? Math.round((present / totalDays) * 100) : 0}%)`, 14, finalY + 14);
      doc.text(`Outstanding Fees: ${formatCedis(student.fee_balance)}`, 14, finalY + 21);

      doc.setDrawColor(212, 165, 55);
      doc.line(14, finalY + 35, 90, finalY + 35);
      doc.line(120, finalY + 35, 196, finalY + 35);
      doc.setFontSize(9);
      doc.text("Class Teacher", 14, finalY + 41);
      doc.text("Head Teacher", 120, finalY + 41);

      doc.save(`report-${student.full_name.replace(/\s+/g, "_")}-${term}.pdf`);
    } finally { setGenerating(false); }
  }

  async function generateAll() {
    for (const s of students) {
      await generate(s.id);
    }
    toast.success("All report cards generated");
  }

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl font-bold">Report Cards</h1><p className="text-sm text-muted-foreground">Generate professional PDF report cards.</p></div>
      <Card>
        <CardHeader><CardTitle>Selection</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Class</Label><Select value={klass} onValueChange={setKlass}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Term</Label><Select value={term} onValueChange={setTerm}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Term 1","Term 2","Term 3"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={generateAll} disabled={generating} className="w-full bg-primary text-primary-foreground">Generate All</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Students in {klass}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {students.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                <span className="font-medium">{s.full_name}</span>
                <Button size="sm" variant="outline" onClick={() => generate(s.id)} disabled={generating}>
                  <FileText className="mr-2 h-4 w-4" /> Generate
                </Button>
              </div>
            ))}
            {!students.length && <p className="py-4 text-center text-sm text-muted-foreground">No students in this class.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
