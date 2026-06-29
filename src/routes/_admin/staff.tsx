import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, UserCog } from "lucide-react";

export const Route = createFileRoute("/_admin/staff")({ component: StaffPage });

const ROLES = ["Head Teacher", "Teacher", "Assistant Teacher", "Bursar", "Secretary", "Security", "Cleaner", "Driver", "Nurse"];

type Staff = {
  id: string; full_name: string; role: string; email: string | null; phone: string | null;
  subject: string | null; dob: string | null; photo_url: string | null; hire_date: string; status: string;
};

function StaffPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<Partial<Staff>>({ role: "Teacher", status: "Active" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await supabase.from("staff").select("*").order("created_at", { ascending: false })).data as Staff[] ?? [],
  });

  const filtered = staff.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.role ?? "").toLowerCase().includes(search.toLowerCase()));

  function openNew() {
    setEditing(null);
    setForm({ role: "Teacher", status: "Active", hire_date: new Date().toISOString().slice(0, 10) });
    setPhotoFile(null);
    setOpen(true);
  }
  function openEdit(s: Staff) {
    setEditing(s); setForm(s); setPhotoFile(null); setOpen(true);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return form.photo_url ?? null;
    const path = `staff/${crypto.randomUUID()}-${photoFile.name}`;
    const { error } = await supabase.storage.from("student-photos").upload(path, photoFile);
    if (error) { toast.error(error.message); return null; }
    const { data } = await supabase.storage.from("student-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  }

  async function save() {
    if (!form.full_name || !form.role) return toast.error("Name and role required");
    const photo_url = await uploadPhoto();
    const payload = { ...form, photo_url } as any;
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = editing
      ? await supabase.from("staff").update(payload).eq("id", editing.id)
      : await supabase.from("staff").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Staff updated" : "Staff added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function remove(id: string) {
    if (!confirm("Remove this staff member?")) return;
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><UserCog className="h-7 w-7 text-accent" />Staff Management</h1>
          <p className="text-sm text-muted-foreground">Manage teachers and non-teaching staff.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Staff" : "New Staff Member"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Full Name *</Label><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Subject</Label><Input value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Date of Birth</Label><Input type="date" value={form.dob ?? ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Hire Date</Label><Input type="date" value={form.hire_date ?? ""} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} /></div>
              <Button onClick={save} className="bg-primary text-primary-foreground">{editing ? "Save Changes" : "Add Staff"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Staff ({staff.length})</span>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or role…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Subject</TableHead>
                <TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                      {s.photo_url ? <img src={s.photo_url} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full w-full place-items-center text-xs">{s.full_name.charAt(0)}</div>}
                    </div>
                    <span className="font-medium">{s.full_name}</span>
                  </TableCell>
                  <TableCell>{s.role}</TableCell>
                  <TableCell>{s.subject ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No staff yet. Click "Add Staff" to get started.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
