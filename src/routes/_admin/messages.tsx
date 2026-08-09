import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { draftParentMessage } from "@/lib/insights.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { CLASSES } from "@/lib/format";
import { MessageSquare, Send, Sparkles, Megaphone, Search, ArrowLeft, Users } from "lucide-react";

export const Route = createFileRoute("/_admin/messages")({
  ssr: false,
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Parent Messaging Hub | Bhest Brhain Academy" },
      { name: "description", content: "Two-way private conversations with parents plus targeted school broadcasts, with AI-drafted replies grounded in each child's record." },
      { property: "og:title", content: "Parent Messaging Hub" },
      { property: "og:description", content: "Message parents privately, broadcast to a class, and let AI draft the first version." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Student = { id: string; full_name: string; class: string; parent_name: string | null; parent_user_id: string | null; student_code: string | null };
type Message = { id: string; student_id: string; body: string; sender_role: string; sender_name: string | null; created_at: string; read_at: string | null };

function initials(n: string) {
  return n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function MessagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <MessageSquare className="h-6 w-6 text-primary" /> Parent Messaging Hub
        </h1>
        <p className="text-sm text-muted-foreground">Private conversations per child, plus targeted broadcasts to whole classes.</p>
      </div>
      <Tabs defaultValue="inbox">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inbox" className="flex-1 sm:flex-none">Conversations</TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1 sm:flex-none">Broadcasts</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4"><Inbox /></TabsContent>
        <TabsContent value="broadcast" className="mt-4"><Broadcasts /></TabsContent>
      </Tabs>
    </div>
  );
}

function Inbox() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const draftFn = useServerFn(draftParentMessage);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState<"warm" | "formal" | "urgent">("warm");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["students-msg"],
    queryFn: async () =>
      ((await supabase.from("students").select("id, full_name, class, parent_name, parent_user_id, student_code").order("full_name")).data ?? []) as Student[],
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ["messages-all"],
    queryFn: async () => ((await supabase.from("messages").select("*").order("created_at", { ascending: true })).data ?? []) as Message[],
    refetchInterval: 15000,
  });

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages-all"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const threads = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const m of allMessages) {
      const arr = map.get(m.student_id) ?? [];
      arr.push(m);
      map.set(m.student_id, arr);
    }
    return students
      .map((s) => {
        const msgs = map.get(s.id) ?? [];
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.sender_role === "parent" && !m.read_at).length;
        return { student: s, msgs, last, unread };
      })
      .filter((t) => t.student.full_name.toLowerCase().includes(search.toLowerCase()) || (t.student.parent_name ?? "").toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.unread !== b.unread) return b.unread - a.unread;
        const at = a.last ? new Date(a.last.created_at).getTime() : 0;
        const bt = b.last ? new Date(b.last.created_at).getTime() : 0;
        return bt - at;
      });
  }, [students, allMessages, search]);

  const active = threads.find((t) => t.student.id === selected) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.msgs.length, selected]);

  // Mark parent messages as read when a thread is opened.
  useEffect(() => {
    if (!active || active.unread === 0) return;
    const ids = active.msgs.filter((m) => m.sender_role === "parent" && !m.read_at).map((m) => m.id);
    if (!ids.length) return;
    supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", ids).then(() => {
      qc.invalidateQueries({ queryKey: ["messages-all"] });
    });
  }, [active, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error("Pick a conversation first");
      if (!body.trim()) throw new Error("Message cannot be empty");
      const { error } = await supabase.from("messages").insert({
        student_id: active.student.id,
        parent_user_id: active.student.parent_user_id,
        sender_user_id: user?.id ?? null,
        sender_role: "admin",
        sender_name: "Bhest Brhain Academy",
        body: body.trim(),
      });
      if (error) throw new Error("Message could not be sent.");
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["messages-all"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not send"),
  });

  const draft = useMutation({
    mutationFn: async () => {
      if (!active) throw new Error("Pick a conversation first");
      if (!intent.trim()) throw new Error("Say what the message is about");
      return draftFn({ data: { student_id: active.student.id, intent: intent.trim(), tone } });
    },
    onSuccess: (r: any) => { setBody(r.draft); toast.success("Draft ready — review before sending"); },
    onError: (e: any) => toast.error(e?.message ?? "Could not draft"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className={active ? "hidden lg:block" : ""}>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search child or parent…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px] lg:h-[560px]">
            <div className="divide-y">
              {threads.map((t) => (
                <button
                  key={t.student.id}
                  onClick={() => setSelected(t.student.id)}
                  className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent ${selected === t.student.id ? "bg-accent" : ""}`}
                >
                  <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="text-xs">{initials(t.student.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{t.student.full_name}</p>
                      {t.unread > 0 && <Badge className="h-5 shrink-0 px-1.5 text-[10px]">{t.unread}</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.last ? t.last.body : `${t.student.class} · no messages yet`}
                    </p>
                    {t.last && <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.last.created_at), { addSuffix: true })}</p>}
                  </div>
                </button>
              ))}
              {threads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No students match.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className={!active ? "hidden lg:block" : ""}>
        {!active ? (
          <CardContent className="flex h-[420px] flex-col items-center justify-center gap-2 text-center lg:h-[600px]">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a conversation to begin.</p>
          </CardContent>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{active.student.full_name}</CardTitle>
                <CardDescription className="truncate">
                  {active.student.class} · Parent: {active.student.parent_name ?? "—"}
                  {!active.student.parent_user_id && " · not linked to a portal account yet"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-4">
              <ScrollArea className="h-[280px] pr-3 sm:h-[320px]">
                <div className="space-y-3">
                  {active.msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet — start the conversation.</p>}
                  {active.msgs.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[75%] ${m.sender_role === "admin" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"}`}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {m.sender_role === "admin" ? "School" : "Parent"} · {format(new Date(m.created_at), "d MMM, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI draft assistant
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="e.g. remind about outstanding fees and Friday's absence" value={intent} onChange={(e) => setIntent(e.target.value)} className="flex-1" />
                  <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                    <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={() => draft.mutate()} disabled={draft.isPending} className="shrink-0">
                    {draft.isPending ? "Drafting…" : "Draft"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Textarea rows={3} placeholder="Write a message to the parent…" value={body} onChange={(e) => setBody(e.target.value)} className="flex-1" />
                <Button onClick={() => send.mutate()} disabled={send.isPending} className="sm:h-10">
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

function Broadcasts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [targetClass, setTargetClass] = useState("__all");

  const { data: list = [] } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => (await supabase.from("broadcasts").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const post = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and message are required");
      const { error } = await supabase.from("broadcasts").insert({
        title: title.trim(),
        body: body.trim(),
        category,
        audience: "all_parents",
        target_class: targetClass === "__all" ? null : targetClass,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error("Broadcast could not be sent.");
    },
    onSuccess: () => { setTitle(""); setBody(""); toast.success("Broadcast sent to parents"); qc.invalidateQueries({ queryKey: ["broadcasts"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not send"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-primary" /> New broadcast</CardTitle>
          <CardDescription>Appears instantly in every targeted parent's portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-term break dates" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["General", "Fees", "Academics", "Events", "Health & Safety", "Urgent"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={targetClass} onValueChange={setTargetClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All parents</SelectItem>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c} parents</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Message</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <Button onClick={() => post.mutate()} disabled={post.isPending} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" /> {post.isPending ? "Sending…" : "Send broadcast"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {list.map((b: any) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{b.title}</CardTitle>
                <div className="flex gap-1.5">
                  <Badge variant="secondary">{b.category}</Badge>
                  <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{b.target_class ?? "All"}</Badge>
                </div>
              </div>
              <CardDescription>{format(new Date(b.created_at), "PPp")}</CardDescription>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{b.body}</CardContent>
          </Card>
        ))}
        {list.length === 0 && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No broadcasts yet.</CardContent></Card>}
      </div>
    </div>
  );
}
