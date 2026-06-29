import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CLASSES } from "@/lib/format";

export const Route = createFileRoute("/_admin/grades")({ component: GradesPage });

const TERMS = ["Term 1", "Term 2", "Term 3"];

function GradesPage() {
  const qc = useQueryClient();
  const [klass, setKlass] = useState("Primary 1");
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");

  const { data: students = [] } = useQuery({
    queryKey: ["grade-students", klass],
    queryFn: async () => (await supabase.from("students").select("id,full_name").eq("class", klass).order("full_name")).data ?? [],
  });
  const { data: grades = [] } = useQuery({
    queryKey: ["grades-class", klass, term, year],
    queryFn: async () => {
      const ids = students.map((s) => s.id);
      if (!ids.length) return [];
      return (await supabase.from("grades").select("*,students(full_name)").in("student_id", ids).eq("term", term).eq("academic_year", year)).data ?? [];
    },
    enabled: students.length > 0,
  });

  async function save() {
    if (!studentId || !subject || !score) return toast.error("Fill all fields");
    const { error } = await supabase.from("grades").insert({
      student_id: studentId, subject, score: Number(score), term, academic_year: year, teacher_comment: comment || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Grade saved");
    setSubject(""); setScore(""); setComment("");
    qc.invalidateQueries({ queryKey: ["grades-class", klass, term, year] });
  }

  const classAvg = useMemo(() => {
    if (!grades.length) return 0;
    return grades.reduce((s: number, g: any) => s + Number(g.score), 0) / grades.length;
  }, [grades]);

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl font-bold">Grades</h1><p className="text-sm text-muted-foreground">Record subject scores per term.</p></div>

      <Card>
        <CardHeader><CardTitle>Add Grade</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div><Label>Class</Label><Select value={klass} onValueChange={setKlass}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Student</Label><Select value={studentId} onValueChange={setStudentId}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Term</Label><Select value={term} onValueChange={setTerm}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Academic Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" /></div>
          <div><Label>Score (0–100)</Label><Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} /></div>
          <div className="md:col-span-3"><Label>Teacher Comment</Label><Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <div className="md:col-span-3"><Button onClick={save} className="bg-primary text-primary-foreground">Save Grade</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{klass} — {term} {year}</CardTitle>
          <p className="text-sm text-muted-foreground">Class average: <strong>{classAvg.toFixed(1)}</strong></p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Comment</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell>{g.students?.full_name}</TableCell>
                  <TableCell>{g.subject}</TableCell>
                  <TableCell className="text-right font-mono">{g.score}</TableCell>
                  <TableCell className="text-muted-foreground">{g.teacher_comment ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!grades.length && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No grades yet for this selection.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
