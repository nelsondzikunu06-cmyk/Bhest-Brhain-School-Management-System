import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateIdCardsPdf, qrDataUrl, qrPayload, type IdCardPerson } from "@/lib/id-cards";
import { IdCard, Download, Search, QrCode } from "lucide-react";

export const Route = createFileRoute("/_admin/id-cards")({
  ssr: false,
  component: IdCardsPage,
  head: () => ({
    meta: [
      { title: "Digital ID Cards | Bhest Brhain Academy" },
      { name: "description", content: "Generate print-ready QR student and staff ID cards in seconds, ready for gate scanning and instant attendance." },
      { property: "og:title", content: "Digital ID Cards" },
      { property: "og:description", content: "Print-ready QR identity cards for every student and staff member." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const YEAR = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

function IdCardsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <IdCard className="h-6 w-6 text-primary" /> Digital ID Cards
        </h1>
        <p className="text-sm text-muted-foreground">
          Every ID carries a QR code. Scan it at the gate to mark attendance instantly — no registers, no queues.
        </p>
      </div>
      <Tabs defaultValue="students">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="students" className="flex-1 sm:flex-none">Students</TabsTrigger>
          <TabsTrigger value="staff" className="flex-1 sm:flex-none">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4"><CardBatch kind="student" /></TabsContent>
        <TabsContent value="staff" className="mt-4"><CardBatch kind="staff" /></TabsContent>
      </Tabs>
    </div>
  );
}

function CardBatch({ kind }: { kind: "student" | "staff" }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["idcard-people", kind],
    queryFn: async () => {
      if (kind === "student") {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, class, student_code, photo_url, status")
          .order("class");
        return (data ?? []).map((s: any) => ({
          id: s.id, name: s.full_name, code: s.student_code, subtitle: s.class,
          meta: s.status, photoPath: s.photo_url, kind: "student" as const,
        }));
      }
      const { data } = await supabase
        .from("staff")
        .select("id, full_name, role, subject, staff_code, photo_url, status")
        .order("full_name");
      return (data ?? []).map((s: any) => ({
        id: s.id, name: s.full_name, code: s.staff_code, subtitle: s.role,
        meta: s.subject ?? s.status, photoPath: s.photo_url, kind: "staff" as const,
      }));
    },
  });

  const filtered = useMemo(
    () => rows.filter((r) => `${r.name} ${r.code ?? ""} ${r.subtitle}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const eligible = filtered.filter((r) => !!r.code);
  const allPicked = eligible.length > 0 && eligible.every((r) => picked.has(r.id));

  function toggle(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function download() {
    const chosen = rows.filter((r) => picked.has(r.id) && r.code);
    if (!chosen.length) return toast.error("Select at least one person with an ID code");
    setBusy(true);
    try {
      const people: IdCardPerson[] = [];
      for (const c of chosen) {
        let photoUrl: string | null = null;
        if (c.photoPath) {
          const { data } = await supabase.storage.from("student-photos").createSignedUrl(c.photoPath, 300);
          photoUrl = data?.signedUrl ?? null;
        }
        people.push({ code: c.code!, name: c.name, subtitle: c.subtitle, meta: c.meta ?? undefined, photoUrl, kind: c.kind });
      }
      await generateIdCardsPdf(people, YEAR);
      toast.success(`${people.length} ID card${people.length > 1 ? "s" : ""} generated`);
    } catch {
      toast.error("Could not generate the ID cards. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicked(allPicked ? new Set() : new Set(eligible.map((r) => r.id)))}
              >
                {allPicked ? "Clear all" : `Select all (${eligible.length})`}
              </Button>
              <Button size="sm" onClick={download} disabled={busy || picked.size === 0}>
                <Download className="mr-2 h-4 w-4" /> {busy ? "Building…" : `Print ${picked.size || ""} card${picked.size === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <IdPreview key={r.id} row={r} picked={picked.has(r.id)} onToggle={() => toggle(r.id)} />
            ))}
            {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Nobody matches that search.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IdPreview({
  row,
  picked,
  onToggle,
}: {
  row: { id: string; name: string; code: string | null; subtitle: string; meta?: string | null; kind: "student" | "staff" };
  picked: boolean;
  onToggle: () => void;
}) {
  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    if (!row.code) return;
    let alive = true;
    qrDataUrl(qrPayload(row.kind, row.code), 160).then((d) => { if (alive) setQr(d); });
    return () => { alive = false; };
  }, [row.code, row.kind]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!row.code}
      className={`w-full overflow-hidden rounded-xl border text-left transition-all disabled:opacity-50 ${picked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
    >
      <div className="flex items-center justify-between bg-primary px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold tracking-wide text-primary-foreground">BHEST BRHAIN ACADEMY</p>
          <p className="text-[9px] text-primary-foreground/70">{row.kind === "student" ? "STUDENT ID" : "STAFF ID"}</p>
        </div>
        <Checkbox checked={picked} className="pointer-events-none border-primary-foreground/60 data-[state=checked]:bg-background" />
      </div>
      <div className="h-1 bg-[hsl(43,52%,50%)]" />
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
          {row.meta && <p className="truncate text-[11px] text-muted-foreground">{row.meta}</p>}
          <div className="mt-1">
            {row.code ? <Badge variant="secondary" className="font-mono text-[10px]">{row.code}</Badge> : <Badge variant="destructive" className="text-[10px]">No ID code</Badge>}
          </div>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded border bg-white">
          {qr ? <img src={qr} alt={`QR code for ${row.name}`} className="h-full w-full object-contain" /> : <QrCode className="h-6 w-6 text-muted-foreground" />}
        </div>
      </div>
    </button>
  );
}
