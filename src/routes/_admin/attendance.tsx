import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X } from "lucide-react";
import { CLASSES } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/attendance")({ component: AttendancePage });

function AttendancePage() {
  const qc = useQueryClient();
  const [klass, setKlass] = useState("Primary 1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: students = [] } = useQuery({
    queryKey: ["att-students", klass],
    queryFn: async () => (await supabase.from("students").select("id,full_name,photo_url").eq("class", klass).eq("status", "Active").order("full_name")).data ?? [],
  });
  const { data: records = [] } = useQuery({
    queryKey: ["att-records", klass, date],
    queryFn: async () => {
      const ids = students.map((s) => s.id);
      if (!ids.length) return [];
      return (await supabase.from("attendance").select("student_id,status").in("student_id", ids).eq("date", date)).data ?? [];
    },
    enabled: students.length > 0,
  });

  const map = new Map(records.map((r) => [r.student_id, r.status]));

  async function mark(studentId: string, status: "present" | "absent") {
    const { error } = await supabase.from("attendance").upsert(
      { student_id: studentId, date, status }, { onConflict: "student_id,date" }
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["att-records", klass, date] });
  }

  async function markAll(status: "present" | "absent") {
    const rows = students.map((s) => ({ student_id: s.id, date, status }));
    if (!rows.length) return;
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) return toast.error(error.message);
    toast.success(`Marked all ${status}`);
    qc.invalidateQueries({ queryKey: ["att-records", klass, date] });
  }

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl font-bold">Attendance</h1><p className="text-sm text-muted-foreground">Mark present or absent in one click.</p></div>
      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-4">
            <div><Label>Class</Label>
              <Select value={klass} onValueChange={setKlass}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => markAll("present")} className="border-emerald-500 text-emerald-700">Mark all present</Button>
              <Button variant="outline" onClick={() => markAll("absent")} className="border-destructive text-destructive">Mark all absent</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {students.map((s) => {
              const st = map.get(s.id);
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarImage src={s.photo_url ?? undefined} /><AvatarFallback>{s.full_name.charAt(0)}</AvatarFallback></Avatar>
                    <span className="font-medium">{s.full_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={st === "present" ? "default" : "outline"} className={st === "present" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => mark(s.id, "present")}>
                      <Check className="mr-1 h-4 w-4" /> Present
                    </Button>
                    <Button size="sm" variant={st === "absent" ? "destructive" : "outline"} onClick={() => mark(s.id, "absent")}>
                      <X className="mr-1 h-4 w-4" /> Absent
                    </Button>
                  </div>
                </div>
              );
            })}
            {!students.length && <p className="py-6 text-center text-sm text-muted-foreground">No active students in this class.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
