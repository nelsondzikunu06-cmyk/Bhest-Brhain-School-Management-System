import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data: list = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function post() {
    if (!title || !body) return toast.error("Title and body required");
    const { error } = await supabase.from("announcements").insert({ title, body });
    if (error) return toast.error(error.message);
    setTitle(""); setBody("");
    toast.success("Posted");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  async function del(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl font-bold">Announcements</h1><p className="text-sm text-muted-foreground">Visible to parents.</p></div>
      <Card>
        <CardHeader><CardTitle>New Announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <Button onClick={post} className="bg-primary text-primary-foreground">Post</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {list.map((a: any) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{a.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPP")}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{a.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
