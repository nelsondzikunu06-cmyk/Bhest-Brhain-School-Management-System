import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { CLASSES, formatCedis } from "@/lib/format";

export const Route = createFileRoute("/_admin/students")({ component: StudentsPage });

type Student = {
  id: string; full_name: string; dob: string | null; class: string;
  parent_name: string | null; parent_phone: string | null; parent_email: string | null;
  fee_balance: number; enrollment_date: string; medical_conditions: string | null;
  status: string; photo_url: string | null; parent_user_id: string | null;
};

const empty = {
  full_name: "", dob: "", class: "Primary 1", parent_name: "", parent_phone: "", parent_email: "",
  fee_balance: "0", enrollment_date: new Date().toISOString().slice(0, 10),
  medical_conditions: "", status: "Active", photo_url: "" as string | null,
};

function StudentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Student[];
    },
  });

  const filtered = students.filter(
    (s) => s.full_name.toLowerCase().includes(q.toLowerCase()) || s.class.toLowerCase().includes(q.toLowerCase())
  );

  function reset() {
    setForm({ ...empty });
    setEditing(null);
    setPhotoFile(null);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      full_name: s.full_name, dob: s.dob ?? "", class: s.class,
      parent_name: s.parent_name ?? "", parent_phone: s.parent_phone ?? "", parent_email: s.parent_email ?? "",
      fee_balance: String(s.fee_balance), enrollment_date: s.enrollment_date,
      medical_conditions: s.medical_conditions ?? "", status: s.status, photo_url: s.photo_url,
    });
    setOpen(true);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return form.photo_url ?? null;
    setUploading(true);
    const ext = photoFile.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("student-photos").upload(path, photoFile, { upsert: false });
    setUploading(false);
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const photo_url = await uploadPhoto();
    const payload = {
      full_name: form.full_name,
      dob: form.dob || null,
      class: form.class,
      parent_name: form.parent_name || null,
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null,
      fee_balance: Number(form.fee_balance) || 0,
      enrollment_date: form.enrollment_date,
      medical_conditions: form.medical_conditions || null,
      status: form.status,
      photo_url,
    };
    if (editing) {
      const { error } = await supabase.from("students").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Student updated");
    } else {
      const { error } = await supabase.from("students").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Student added");
    }
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["students"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this student? This will remove all related records.")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["students"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {students.length} student(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add Student</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Student" : "Admission Form"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-accent">
                  <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{form.full_name.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <label className="cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-secondary">
                  <Upload className="mr-2 inline h-4 w-4" />Passport Picture
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><Label>Full Name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div>
                  <Label>Class *</Label>
                  <Select value={form.class} onValueChange={(v) => setForm({ ...form, class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Graduated">Graduated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
                <div><Label>Parent Phone</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Parent Email (used to link parent portal)</Label><Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
                <div><Label>Fee Balance (₵)</Label><Input type="number" step="0.01" value={form.fee_balance} onChange={(e) => setForm({ ...form, fee_balance: e.target.value })} /></div>
                <div><Label>Enrollment Date</Label><Input type="date" value={form.enrollment_date} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Medical Conditions</Label><Textarea rows={2} value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={uploading} className="bg-primary text-primary-foreground">
                  {uploading ? "Uploading…" : editing ? "Save Changes" : "Add Student"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or class…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Parent Phone</TableHead>
                <TableHead>Fee Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={s.photo_url ?? undefined} /><AvatarFallback>{s.full_name.charAt(0)}</AvatarFallback></Avatar>
                      <span className="font-medium">{s.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell>{s.parent_phone ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatCedis(s.fee_balance)}</TableCell>
                  <TableCell><Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No students found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
